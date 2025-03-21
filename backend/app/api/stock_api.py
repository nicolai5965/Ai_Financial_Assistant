"""
FastAPI server for stock analysis endpoints.
This module provides REST API endpoints for stock data analysis and visualization.
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import date, timedelta, datetime
import logging
import asyncio

from ..stock_analysis.stock_data_fetcher import fetch_stock_data, get_company_name, get_company_info, CompanyInfo
from ..stock_analysis.stock_data_charting import analyze_ticker
from ..core.logging_config import get_logger
from ..stock_analysis.kpi_manager import get_kpis, AVAILABLE_KPI_GROUPS
from ..stock_analysis.market_hours import MarketHoursTracker

# Get the logger
logger = get_logger()

# Create FastAPI application
app = FastAPI(
    title="Stock Analysis API",
    description="API for analyzing and visualizing stock market data",
    version="1.0.0"
)

# Initialize the market hours tracker
market_hours_tracker = MarketHoursTracker()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define indicator configuration model
class IndicatorConfig(BaseModel):
    """
    Configuration model for a technical indicator.
    """
    name: str = Field(..., description="Name of the technical indicator")
    panel: Optional[str] = Field(None, description="Panel to display the indicator in (main, oscillator, macd, volume, volatility)")
    window: Optional[int] = Field(None, description="Window size for indicators that use a single window")
    # MACD specific parameters
    fast_window: Optional[int] = Field(None, description="Fast EMA window size for MACD")
    slow_window: Optional[int] = Field(None, description="Slow EMA window size for MACD")
    signal_window: Optional[int] = Field(None, description="Signal line window size for MACD")
    # Stochastic Oscillator specific parameters
    k_window: Optional[int] = Field(None, description="Window size for %K calculation")
    d_window: Optional[int] = Field(None, description="Window size for %D calculation")
    # Ichimoku Cloud specific parameters
    conversion_period: Optional[int] = Field(None, description="Period for Conversion Line (Tenkan-sen)")
    base_period: Optional[int] = Field(None, description="Period for Base Line (Kijun-sen)")
    lagging_span_b_period: Optional[int] = Field(None, description="Period for Lagging Span B")
    # Bollinger Bands specific parameters
    std_dev: Optional[int] = Field(None, description="Number of standard deviations for Bollinger Bands")
    
    model_config = {
        "extra": "allow",  # Allow additional fields for future extensibility
        "populate_by_name": True,  # Allow populating by field name
        "json_schema_extra": {
            "examples": [
                {
                    "name": "RSI",
                    "panel": "oscillator",
                    "window": 14
                },
                {
                    "name": "MACD",
                    "panel": "macd",
                    "fast_window": 12,
                    "slow_window": 26,
                    "signal_window": 9
                }
            ]
        }
    }

class DashboardDataRequest(BaseModel):
    """
    Combined request model for all dashboard data.
    Replaces individual request models for chart, KPIs, market hours, and company info.
    """
    ticker: str = Field(..., description="Stock ticker symbol (e.g., 'AAPL')")
    # Chart-specific fields
    days: Optional[int] = Field(10, description="Number of days to look back for chart data")
    interval: str = Field("1d", description="Data interval for chart (e.g., '1d', '1h', '5m')")
    indicators: List[Union[str, IndicatorConfig]] = Field(
        default=[], 
        description="List of technical indicators to include in chart"
    )
    chart_type: str = Field("candlestick", description="Chart type: 'candlestick' or 'line'")
    # KPI-specific fields
    kpi_groups: Optional[List[str]] = Field(None, description="Optional list of KPI groups to include")
    kpi_timeframe: str = Field("1d", description="Timeframe for KPI data")
    use_cache: bool = Field(True, description="Whether to use cached data if available")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "ticker": "AAPL",
                    "days": 10,
                    "interval": "1d",
                    "indicators": ["RSI", "MACD"],
                    "chart_type": "candlestick",
                    "kpi_groups": ["price", "volume"],
                    "kpi_timeframe": "1d",
                    "use_cache": True
                }
            ]
        }
    }

def process_indicators(indicators: List[Union[str, IndicatorConfig]]) -> List[Dict]:
    """
    Process and standardize different indicator input formats into a uniform dictionary format.
    
    Args:
        indicators: List of indicators which can be strings or IndicatorConfig objects
        
    Returns:
        List of indicator dictionaries with standardized format
    """
    processed_indicators = []
    
    for indicator in indicators:
        # Case 1: Simple string indicator
        if isinstance(indicator, str):
            logger.debug(f"Converting string indicator '{indicator}' to dict format")
            processed_indicators.append({"name": indicator})
            
        # Case 2: Pydantic v2 model
        elif hasattr(indicator, 'model_dump') and callable(getattr(indicator, 'model_dump')):
            try:
                indicator_dict = indicator.model_dump(exclude_none=True)
                logger.debug(f"Converted Pydantic v2 model to dict: {indicator_dict}")
                processed_indicators.append(indicator_dict)
            except Exception as e:
                logger.error(f"Error converting Pydantic v2 model: {str(e)}")
                # Fallback to minimal dict if conversion fails
                if hasattr(indicator, 'name'):
                    processed_indicators.append({"name": indicator.name})
                    
        # Case 3: Pydantic v1 model
        elif hasattr(indicator, 'dict') and callable(getattr(indicator, 'dict')):
            try:
                indicator_dict = indicator.dict(exclude_none=True)
                logger.debug(f"Converted Pydantic v1 model to dict: {indicator_dict}")
                processed_indicators.append(indicator_dict)
            except Exception as e:
                logger.error(f"Error converting Pydantic model: {str(e)}")
                # Fallback to minimal dict if conversion fails
                if hasattr(indicator, 'name'):
                    processed_indicators.append({"name": indicator.name})
                    
        # Case 4: Already a dict or other object
        else:
            processed_indicators.append(indicator)
    
    # Log indicator panel assignments for clarity
    for indicator in processed_indicators:
        if isinstance(indicator, dict) and 'name' in indicator:
            panel = indicator.get('panel', 'main')
            logger.debug(f"Indicator '{indicator['name']}' assigned to panel '{panel}'")
        elif hasattr(indicator, 'name'):
            panel = indicator.panel if hasattr(indicator, 'panel') and indicator.panel else 'main'
            logger.debug(f"Indicator '{indicator.name}' assigned to panel '{panel}'")
            
    return processed_indicators

def calculate_date_range(days: int, interval: str) -> tuple:
    """
    Calculate and validate the appropriate date range based on the interval and days.
    Some intervals have maximum allowed time periods per the data provider's limitations.
    
    Args:
        days: Number of days to look back
        interval: Data interval string (e.g., '1d', '1h', '5m')
        
    Returns:
        Tuple of (start_date, end_date) after validation
    """
    # End date is tomorrow to ensure today's data is included (yfinance treats end as exclusive)
    end_date = date.today() + timedelta(days=1)
    start_date = end_date - timedelta(days=days)
    
    # Interval-specific maximum day limits
    interval_max_days = {
        "1m": 7,
        "2m": 60,
        "5m": 60,
        "15m": 60,
        "30m": 60,
        "1h": 730
    }
    
    # Adjust start_date if days exceeds the maximum for this interval
    if interval in interval_max_days:
        max_allowed = interval_max_days[interval]
        if days > max_allowed:
            logger.warning(f"Requested {days} days for interval {interval}, but max allowed is {max_allowed}")
            start_date = end_date - timedelta(days=max_allowed)
    
    return start_date, end_date

@app.post("/api/stocks/dashboard-data")
async def get_dashboard_data(request: DashboardDataRequest):
    """
    Unified endpoint that fetches all dashboard data for a specific ticker in a single request.
    Replaces separate endpoints for chart, KPIs, market hours, and company info.
    
    Args:
        request: DashboardDataRequest containing all parameters
        
    Returns:
        JSON: Combined dashboard data including chart, KPIs, market hours, and company info
    """
    try:
        ticker = request.ticker.strip().upper()
        if not ticker:
            raise HTTPException(status_code=400, detail="Ticker symbol is required")
        
        logger.info(f"Getting unified dashboard data for ticker: {ticker}")
        
        # Create tasks for parallel execution
        tasks = []
        
        # Task 1: Chart Data
        async def get_chart_data():
            try:
                processed_indicators = process_indicators(request.indicators)
                start_date, end_date = calculate_date_range(request.days, request.interval)
                
                stock_data = fetch_stock_data([ticker], start_date, end_date, request.interval)
                if not stock_data or ticker not in stock_data:
                    return {"error": f"No data found for ticker {ticker}"}
                
                ticker_data = stock_data[ticker]
                if ticker_data.empty:
                    return {"error": f"No trading data found for {ticker}"}
                
                company_name = get_company_name(ticker)
                fig = analyze_ticker(
                    ticker, 
                    ticker_data, 
                    processed_indicators, 
                    request.interval,
                    chart_type=request.chart_type
                )
                
                return {
                    "chart": fig.to_json(),
                    "company_name": company_name
                }
            except Exception as e:
                logger.exception(f"Error processing chart data: {str(e)}")
                return {"error": str(e)}
        
        # Task 2: KPI Data
        async def get_kpi_data():
            try:
                return {
                    "kpi_data": get_kpis(
                        ticker, 
                        request.kpi_groups, 
                        request.kpi_timeframe, 
                        request.use_cache
                    )
                }
            except Exception as e:
                logger.exception(f"Error processing KPI data: {str(e)}")
                return {"error": str(e)}
        
        # Task 3: Market Hours Data
        async def get_market_hours_data():
            try:
                market_status = market_hours_tracker.get_market_status(ticker)
                return {
                    "is_market_open": market_status["is_market_open"],
                    "exchange": market_status["exchange"],
                    "next_state": market_status["next_state"],
                    "next_state_change": market_status["next_state_change"].isoformat(),
                    "seconds_until_change": market_status["seconds_until_change"],
                    "current_time": market_status["current_time"].isoformat()
                }
            except Exception as e:
                logger.exception(f"Error processing market hours data: {str(e)}")
                return {"error": str(e)}
        
        # Task 4: Company Info Data
        async def get_company_info_data():
            try:
                company_info = get_company_info(ticker)
                return {
                    "name": company_info.Name,
                    "sector": company_info.Sector,
                    "industry": company_info.Industry,
                    "country": company_info.Country,
                    "website": company_info.Website
                }
            except Exception as e:
                logger.exception(f"Error processing company info data: {str(e)}")
                return {"error": str(e)}

        # Add all tasks for parallel execution
        tasks = [
            asyncio.create_task(get_chart_data()),
            asyncio.create_task(get_kpi_data()),
            asyncio.create_task(get_market_hours_data()),
            asyncio.create_task(get_company_info_data())
        ]
        
        # Execute all tasks concurrently
        chart_result, kpi_result, market_hours_result, company_info_result = await asyncio.gather(*tasks)
        
        # Prepare unified response
        response = {
            "ticker": ticker,
            "timestamp": datetime.now().isoformat(),
            "chart_data": chart_result,
            "kpi_data": kpi_result,
            "market_hours": market_hours_result,
            "company_info": company_info_result
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.exception(f"Error processing dashboard data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing dashboard data: {str(e)}")

# Simple health check endpoint
@app.get("/api/health")
async def health_check():
    """
    Health check endpoint to verify the API is running.
    """
    return {"status": "healthy", "service": "stock-analysis-api"}

# Global exception handler for unhandled exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )
