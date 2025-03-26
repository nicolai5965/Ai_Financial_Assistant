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

# Assuming these imports point to correct local modules
try:
    from ..stock_analysis.stock_data_fetcher import fetch_stock_data, get_company_name, get_company_info, CompanyInfo
    from ..stock_analysis.stock_data_charting import analyze_ticker
    from ..core.logging_config import get_logger
    from ..stock_analysis.kpi_manager import get_kpis, AVAILABLE_KPI_GROUPS
    from ..stock_analysis.market_hours import MarketHoursTracker
except ImportError:
    # Provide fallback or handle appropriately if running script directly/differently
    print("Warning: Could not import local modules using relative paths. Ensure structure is correct or adjust imports.")
    # Add mock/placeholder imports if needed for basic linting/testing
    class MarketHoursTracker:
        def get_market_status(self, ticker): return {"is_market_open": False, "exchange": "N/A", "next_state": "N/A", "next_state_change": datetime.now(), "seconds_until_change": 0, "current_time": datetime.now()}
        def fetch_stock_data(*args, **kwargs): return {}
        def get_company_name(ticker): return f"{ticker} Name Placeholder"
        def get_company_info(ticker): return type('obj', (object,), {'Name': 'N/A', 'Sector': 'N/A', 'Industry': 'N/A', 'Country': 'N/A', 'Website': 'N/A'})()
        def analyze_ticker(*args, **kwargs): return type('obj', (object,), {'to_json': lambda: '{}'})()
        def get_logger(): return logging.getLogger(__name__)
        def get_kpis(*args, **kwargs): return {}
        AVAILABLE_KPI_GROUPS = []


# Get the logger
logger = get_logger()
if not logger.hasHandlers(): # Basic logging setup if not configured elsewhere
    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger(__name__)


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
    The order of checks has been changed to: Pydantic v2, Pydantic v1, string, fallback.

    Args:
        indicators: List of indicators which can be strings or IndicatorConfig objects

    Returns:
        List of indicator dictionaries with standardized format
    """
    processed_indicators = []

    for indicator in indicators:
        # Case 1: Pydantic v2 model check
        if hasattr(indicator, 'model_dump') and callable(getattr(indicator, 'model_dump')):
            logger.debug(f"DEBUG-API: Indicator is a Pydantic v2 model: {indicator}")
            try:
                # Ensure it's actually an IndicatorConfig or similar Pydantic model
                # This check helps prevent accidentally calling model_dump on other objects
                if isinstance(indicator, BaseModel):
                    indicator_dict = indicator.model_dump(exclude_none=False)
                    logger.debug(f"Converted Pydantic v2 model to dict: {indicator_dict}")
                    processed_indicators.append(indicator_dict)
                else:
                    # If it has model_dump but isn't a Pydantic model, treat as fallback
                    logger.warning(f"Object has 'model_dump' but is not Pydantic BaseModel: {type(indicator)}. Using fallback.")
                    processed_indicators.append(indicator) # Or handle differently if needed
            except Exception as e:
                logger.error(f"Error converting Pydantic v2 model: {str(e)}")
                # Fallback to minimal dict if conversion fails but has name
                if hasattr(indicator, 'name'):
                    processed_indicators.append({"name": indicator.name})
                else: # If no name, append original object to see what it was
                     processed_indicators.append(indicator)

        # Case 2: Pydantic v1 model check
        elif hasattr(indicator, 'dict') and callable(getattr(indicator, 'dict')):
            try:
                 # Ensure it's actually a Pydantic model (might catch v1 and maybe some v2 if 'dict' exists)
                if isinstance(indicator, BaseModel):
                    indicator_dict = indicator.dict(exclude_none=True)
                    logger.debug(f"Converted Pydantic v1 model to dict: {indicator_dict}")
                    processed_indicators.append(indicator_dict)
                else:
                    # If it has dict but isn't a Pydantic model, treat as fallback
                    logger.warning(f"Object has 'dict' but is not Pydantic BaseModel: {type(indicator)}. Using fallback.")
                    processed_indicators.append(indicator) # Or handle differently
            except Exception as e:
                logger.error(f"Error converting Pydantic model (v1 style): {str(e)}")
                # Fallback to minimal dict if conversion fails but has name
                if hasattr(indicator, 'name'):
                    processed_indicators.append({"name": indicator.name})
                else: # If no name, append original object
                    processed_indicators.append(indicator)

        # Case 3: Simple string indicator check
        elif isinstance(indicator, str):
            logger.debug(f"Converting string indicator '{indicator}' to dict format")
            processed_indicators.append({"name": indicator})

        # Case 4: Already a dict or other object (Fallback)
        else:
            # Assuming it might be a dictionary already or some other type
            logger.debug(f"Indicator is not string or known Pydantic model type, appending as is: {type(indicator)}")
            processed_indicators.append(indicator)
        # --- End of New Order ---

    # Log indicator panel assignments for clarity - This part remains unchanged
    for processed_indicator in processed_indicators:
        panel = 'main' # Default panel
        name = 'Unknown'
        if isinstance(processed_indicator, dict) and 'name' in processed_indicator:
            name = processed_indicator['name']
            panel = processed_indicator.get('panel', 'main')
        elif hasattr(processed_indicator, 'name'): # Handles case where conversion failed but object had name
             name = processed_indicator.name
             panel = processed_indicator.panel if hasattr(processed_indicator, 'panel') and processed_indicator.panel else 'main'
        # Only log if we have a name
        if name != 'Unknown':
            logger.debug(f"Indicator '{name}' assigned to panel '{panel}'")
        else:
            logger.warning(f"Processed indicator lacks a 'name', cannot log panel assignment: {processed_indicator}")


    # Final check to ensure all elements are dictionaries as expected by downstream funcs
    final_indicators = []
    for i, item in enumerate(processed_indicators):
        if isinstance(item, dict):
            final_indicators.append(item)
        else:
            logger.error(f"Item at index {i} in processed_indicators is not a dict after processing: {type(item)}. Value: {item}. Skipping.")
            # Depending on requirements, you might want to raise an error here instead of skipping

    return final_indicators


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

    logical_end_date = date.today()
    # Calculate start date based on requested days
    start_date = logical_end_date  - timedelta(days=days)

    # Clamp start date based on interval limits (yfinance specific limits)
    # Note: Using days back from 'today'. Max periods are often counted differently.
    # Example: 1m data is limited to the last 7 days.
    now = datetime.now()
    limit_start_date = None

    if interval == "1m":
        limit_start_date = now - timedelta(days=7)
    elif interval in ["2m", "5m", "15m", "30m"]:
         # For intervals <= 30m, yfinance limit is 60 days
        limit_start_date = now - timedelta(days=60)
    elif interval == "1h":
         # For 1h, yfinance limit is 730 days
        limit_start_date = now - timedelta(days=730)
    # Daily ('1d'), weekly ('1wk'), monthly ('1mo') usually go back very far.

    # If a limit applies and the requested start_date is earlier than the limit, adjust it.
    if limit_start_date:
        # Convert limit_start_date (datetime) to date for comparison
        limit_start_date_date = limit_start_date.date()
        if start_date < limit_start_date_date:
            original_days = days
            new_start_date = limit_start_date_date
            # Calculate the effective number of days
            effective_days = (logical_end_date - new_start_date).days
            logger.warning(
                f"Requested {original_days} days for interval {interval}, but provider limit "
                f"restricts start date to {new_start_date}. Fetching approx {effective_days} days."
            )
            start_date = new_start_date

    # Calculate the end_date to be passed to yfinance (+1 day for inclusivity)
    adjusted_end_date = logical_end_date + timedelta(days=1)
    # Convert dates to string format 'YYYY-MM-DD' if needed by fetch_stock_data
    # Assuming fetch_stock_data accepts date objects based on original code context
    return start_date, adjusted_end_date # Return date objects


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
                # Ensure process_indicators returns only dicts
                processed_indicators = process_indicators(request.indicators)
                start_date, end_date = calculate_date_range(request.days, request.interval)

                # Fetch data using date objects or string format as required by fetch_stock_data
                # Assuming fetch_stock_data takes date objects here:
                stock_data = fetch_stock_data([ticker], start_date, end_date, request.interval)

                if not stock_data or ticker not in stock_data or stock_data[ticker].empty:
                    logger.warning(f"No trading data found for {ticker} in the specified range/interval.")
                    # Return a structure indicating no data, rather than an error disrupting the whole response
                    return {"chart": None, "company_name": get_company_name(ticker), "indicators": processed_indicators, "message": f"No chart data found for {ticker} ({start_date} to {end_date}, interval {request.interval})"}

                ticker_data = stock_data[ticker]
                company_name = get_company_name(ticker)

                fig = analyze_ticker(
                    ticker,
                    ticker_data,
                    processed_indicators, # Already verified list of dicts
                    request.interval,
                    chart_type=request.chart_type
                )

                return {
                    "chart": fig.to_json(),
                    "company_name": company_name,
                    "indicators": processed_indicators,
                }
            except Exception as e:
                logger.exception(f"Error processing chart data for {ticker}: {str(e)}")
                # Return error within the chart_data part of the response
                return {"error": f"Failed to generate chart data: {str(e)}"}

        # Task 2: KPI Data
        async def get_kpi_data():
            try:
                kpi_result = get_kpis(
                        ticker,
                        request.kpi_groups,
                        request.kpi_timeframe,
                        request.use_cache
                    )
                # Check if kpi_result indicates an error or no data, handle appropriately if needed
                return { "kpi_data": kpi_result }

            except Exception as e:
                logger.exception(f"Error processing KPI data for {ticker}: {str(e)}")
                return {"error": f"Failed to retrieve KPI data: {str(e)}"}

        # Task 3: Market Hours Data
        async def get_market_hours_data():
            try:
                market_status = market_hours_tracker.get_market_status(ticker)
                # Convert datetime objects to ISO format strings for JSON serialization
                return {
                    "is_market_open": market_status.get("is_market_open"),
                    "exchange": market_status.get("exchange"),
                    "next_state": market_status.get("next_state"),
                    "next_state_change": market_status.get("next_state_change").isoformat() if market_status.get("next_state_change") else None,
                    "seconds_until_change": market_status.get("seconds_until_change"),
                    "current_time": market_status.get("current_time").isoformat() if market_status.get("current_time") else None
                }
            except Exception as e:
                logger.exception(f"Error processing market hours data for {ticker}: {str(e)}")
                return {"error": f"Failed to retrieve market hours: {str(e)}"}

        # Task 4: Company Info Data
        async def get_company_info_data():
            try:
                company_info = get_company_info(ticker)
                # Access attributes safely, providing defaults if they might be missing
                return {
                    "name": getattr(company_info, 'Name', 'N/A'),
                    "sector": getattr(company_info, 'Sector', 'N/A'),
                    "industry": getattr(company_info, 'Industry', 'N/A'),
                    "country": getattr(company_info, 'Country', 'N/A'),
                    "website": getattr(company_info, 'Website', 'N/A')
                }
            except Exception as e:
                logger.exception(f"Error processing company info data for {ticker}: {str(e)}")
                return {"error": f"Failed to retrieve company info: {str(e)}"}

        # Add all tasks for parallel execution
        tasks = [
            asyncio.create_task(get_chart_data()),
            asyncio.create_task(get_kpi_data()),
            asyncio.create_task(get_market_hours_data()),
            asyncio.create_task(get_company_info_data())
        ]

        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks)
        chart_result, kpi_result, market_hours_result, company_info_result = results

        # Prepare unified response
        response = {
            "ticker": ticker,
            "timestamp": datetime.now().isoformat(),
            "chart_data": chart_result,
            "kpi_data": kpi_result,
            "market_hours": market_hours_result,
            "company_info": company_info_result
        }

        # Check if any sub-task returned an error structure
        has_errors = any(isinstance(res, dict) and 'error' in res for res in results)

        # Return JSONResponse, potentially with a different status code if critical errors occurred
        # For now, return 200 OK but include error details within the specific section
        return JSONResponse(content=response)

    except HTTPException as http_exc:
        # Re-raise HTTPExceptions (like validation errors)
        raise http_exc
    except Exception as e:
        # Catch-all for unexpected errors during request handling setup
        logger.exception(f"Critical error processing dashboard data request for {request.ticker if request else 'unknown ticker'}: {str(e)}")
        # Return a 500 error response
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error while processing dashboard data: {str(e)}"}
        )


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
    # Avoid logging HTTPException again if it reaches here
    if isinstance(exc, HTTPException):
        # Let FastAPI's default handler manage HTTPExceptions unless custom handling is needed
        return await request.app.default_exception_handler(request, exc)

    # Log other unexpected exceptions
    logger.exception(f"Unhandled exception during request to {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: An unexpected error occurred."} # Avoid exposing raw error details
    )

# If running this file directly (for testing, etc.)
# Note: Imports might need adjustment if run this way
if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server directly...")
    # Ensure logger is configured if running standalone
    if not logger.hasHandlers():
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger(__name__)
    uvicorn.run(app, host="0.0.0.0", port=8000)