"""
FastAPI server for stock analysis endpoints.
This module provides REST API endpoints for stock data analysis and visualization.
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import date, timedelta
import logging

from ..stock_analysis.stock_data_fetcher import fetch_stock_data, get_company_name
from ..stock_analysis.stock_data_charting import analyze_ticker
from ..core.logging_config import get_logger

# Get the logger
logger = get_logger()

# Create FastAPI application
app = FastAPI(
    title="Stock Analysis API",
    description="API for analyzing and visualizing stock market data",
    version="1.0.0"
)

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

# Define request model
class StockAnalysisRequest(BaseModel):
    """
    Request model for stock analysis.
    """
    ticker: str = Field(..., description="Stock ticker symbol (e.g., 'AAPL')")
    days: Optional[int] = Field(10, description="Number of days to look back")
    interval: str = Field("1d", description="Data interval (e.g., '1d', '1h', '5m', '1m', '1wk', '1mo')")
    indicators: List[Union[str, IndicatorConfig]] = Field(
        default=[], 
        description="List of technical indicators to include. Can be simple strings or detailed configurations."
    )
    chart_type: str = Field("candlestick", description="Chart type: 'candlestick' or 'line'")

# Create API endpoints
@app.post("/api/stocks/analyze")
async def analyze_stock(request: StockAnalysisRequest):
    """
    Analyze stock data and return a visualization.
    
    Args:
        request: StockAnalysisRequest containing analysis parameters
        
    Returns:
        JSON: Plotly figure JSON representation
    """
    try:
        # Store ticker in a local variable to avoid repeated access to request.ticker
        ticker = request.ticker
        
        logger.info(f"Analyzing stock data for {ticker} with {request.interval} interval")
        
        # Pre-process indicators to ensure they're properly structured
        processed_indicators = []
        for indicator in request.indicators:
            if isinstance(indicator, str):
                # Convert string indicators to dict format with name
                logger.debug(f"Converting string indicator '{indicator}' to dict format")
                processed_indicators.append({"name": indicator})
            elif hasattr(indicator, 'model_dump') and callable(getattr(indicator, 'model_dump')):
                # Handle Pydantic v2 models
                try:
                    indicator_dict = indicator.model_dump(exclude_none=True)
                    logger.debug(f"Converted Pydantic v2 model to dict: {indicator_dict}")
                    processed_indicators.append(indicator_dict)
                except Exception as e:
                    logger.error(f"Error converting Pydantic v2 model: {str(e)}")
                    # Fallback: convert to dict with just the name
                    if hasattr(indicator, 'name'):
                        processed_indicators.append({"name": indicator.name})
            elif hasattr(indicator, 'dict') and callable(getattr(indicator, 'dict')):
                # Handle Pydantic v1 models
                try:
                    indicator_dict = indicator.dict(exclude_none=True)
                    logger.debug(f"Converted Pydantic v1 model to dict: {indicator_dict}")
                    processed_indicators.append(indicator_dict)
                except Exception as e:
                    logger.error(f"Error converting Pydantic model: {str(e)}")
                    # Fallback: convert to dict with just the name
                    if hasattr(indicator, 'name'):
                        processed_indicators.append({"name": indicator.name})
            else:
                # Keep other types as they are (they'll be handled by add_indicator_to_chart)
                processed_indicators.append(indicator)
        
        # Log indicator configurations with their panel assignments
        for indicator in processed_indicators:
            if isinstance(indicator, dict) and 'name' in indicator:
                panel = indicator.get('panel', 'main')
                logger.debug(f"Indicator '{indicator['name']}' assigned to panel '{panel}'")
            elif hasattr(indicator, 'name'):
                panel = indicator.panel if hasattr(indicator, 'panel') and indicator.panel else 'main'
                logger.debug(f"Indicator '{indicator.name}' assigned to panel '{panel}'")
        
        # Calculate date range
        end_date = date.today() + timedelta(days=1)  # Add 1 day because yfinance treats end date as exclusive
        start_date = end_date - timedelta(days=request.days)
        
        # Validate interval and days
        interval_max_days = {
            "1m": 7,
            "2m": 60,
            "5m": 60,
            "15m": 60,
            "30m": 60,
            "1h": 730
            # For "1d", "1wk", and "1mo", no maximum day limits are enforced
        }
        
        if request.interval in interval_max_days:
            max_allowed = interval_max_days[request.interval]
            if request.days > max_allowed:
                logger.warning(f"Requested {request.days} days for interval {request.interval}, but max allowed is {max_allowed}")
                start_date = end_date - timedelta(days=max_allowed)
        
        # Fetch stock data
        tickers = [ticker]
        stock_data = fetch_stock_data(tickers, start_date, end_date, request.interval)
        
        if not stock_data or ticker not in stock_data:
            logger.error(f"No data found for ticker {ticker}")
            raise HTTPException(status_code=404, detail=f"No data found for ticker {ticker}")
        
        # Use the stock data directly without filtering
        ticker_data = stock_data[ticker]
        
        if ticker_data.empty:
            logger.error(f"No trading data found for {ticker}")
            raise HTTPException(status_code=404, detail=f"No trading data found for {ticker}")
        
        # Get company name (only once)
        company_name = get_company_name(ticker)
        
        # Generate chart using processed indicators
        fig = analyze_ticker(
            ticker, 
            ticker_data, 
            processed_indicators, 
            request.interval,
            chart_type=request.chart_type
        )
        
        # Convert to JSON
        chart_json = fig.to_json()
        
        return JSONResponse(content={"chart": chart_json, "ticker": ticker, "company_name": company_name})
    
    except Exception as e:
        logger.exception(f"Error analyzing stock data: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing request")


# Simple health check endpoint
@app.get("/api/health")
async def health_check():
    """
    Health check endpoint to verify the API is running.
    """
    return {"status": "healthy", "service": "stock-analysis-api"}

# Error handling
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for the API.
    """
    logger.exception(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    ) 