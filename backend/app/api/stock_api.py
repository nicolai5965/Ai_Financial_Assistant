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
import pandas as pd
import plotly.graph_objects as go
import math # Import math for ceiling function

# Assuming these imports point to correct local modules
try:
    from ..stock_analysis.stock_data_fetcher import fetch_stock_data, get_company_name, get_company_info, CompanyInfo
    from ..stock_analysis.stock_data_charting import analyze_ticker
    from ..core.logging_config import get_logger
    from ..stock_analysis.kpi_manager import get_kpis
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
        def analyze_ticker(*args, **kwargs): return type('obj', (object,), {'to_json': lambda: '{}', 'data': tuple(), 'update_xaxes': lambda **kw: None, 'update_yaxes': lambda **kw: None})() # Use tuple for data
        def get_logger(): return logging.getLogger(__name__)
        def get_kpis(*args, **kwargs): return {}



# Get the logger
logger = get_logger()
if not logger.hasHandlers(): # Basic logging setup if not configured elsewhere
    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger(__name__)


# --- yfinance interval limits (days back from today) ---
YFINANCE_INTERVAL_LIMITS_DAYS = {
    "1m": 7,
    "2m": 60,
    "5m": 60,
    "15m": 60,
    "30m": 60,
    "60m": 730, # Often same as 1h
    "90m": 60,  # Often grouped with <= 1h, be conservative
    "1h": 730,
    "1d": float('inf'),
    "5d": float('inf'),
    "1wk": float('inf'),
    "1mo": float('inf'),
    "3mo": float('inf'),
}

# Create FastAPI application
app = FastAPI(
    title="Stock Analysis API",
    description="API for analyzing and visualizing stock market data",
    version="1.0.5" # Incremented version for fix
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

# --- IndicatorConfig and DashboardDataRequest Models (Unchanged) ---
class IndicatorConfig(BaseModel):
    name: str = Field(..., description="Name of the technical indicator")
    panel: Optional[str] = Field(None, description="Panel to display the indicator in (main, oscillator, macd, volume, volatility)")
    window: Optional[int] = Field(None, description="Window size for indicators that use a single window")
    fast_window: Optional[int] = Field(None, description="Fast EMA window size for MACD")
    slow_window: Optional[int] = Field(None, description="Slow EMA window size for MACD")
    signal_window: Optional[int] = Field(None, description="Signal line window size for MACD")
    k_window: Optional[int] = Field(None, description="Window size for %K calculation")
    d_window: Optional[int] = Field(None, description="Window size for %D calculation")
    conversion_period: Optional[int] = Field(None, description="Period for Conversion Line (Tenkan-sen)")
    base_period: Optional[int] = Field(None, description="Period for Base Line (Kijun-sen)")
    lagging_span_b_period: Optional[int] = Field(None, description="Period for Lagging Span B")
    std_dev: Optional[int] = Field(None, description="Number of standard deviations for Bollinger Bands")
    model_config = {"extra": "allow", "populate_by_name": True}

class DashboardDataRequest(BaseModel):
    ticker: str = Field(..., description="Stock ticker symbol (e.g., 'AAPL')")
    days: Optional[int] = Field(10, description="Number of days to display on the chart")
    interval: str = Field("1d", description="Data interval for chart (e.g., '1d', '1h', '5m')")
    indicators: List[Union[str, IndicatorConfig]] = Field(default=[], description="List of technical indicators")
    chart_type: str = Field("candlestick", description="Chart type: 'candlestick' or 'line'")
    kpi_groups: Optional[List[str]] = Field(None, description="Optional list of KPI groups")
    kpi_timeframe: str = Field("1d", description="Timeframe for KPI data")
    use_cache: bool = Field(True, description="Whether to use cached data if available")

# --- process_indicators function (Unchanged) ---
def process_indicators(indicators: List[Union[str, IndicatorConfig]]) -> List[Dict]:
    # ... (same implementation) ...
    processed_indicators = []
    for indicator in indicators:
        if hasattr(indicator, 'model_dump') and callable(getattr(indicator, 'model_dump')):
            if isinstance(indicator, BaseModel):
                indicator_dict = {k: v for k, v in indicator.model_dump(exclude_none=False).items() if v is not None}
                processed_indicators.append(indicator_dict)
            else: logger.warning(f"Object has 'model_dump' but not BaseModel: {type(indicator)}"); processed_indicators.append(indicator)
        elif hasattr(indicator, 'dict') and callable(getattr(indicator, 'dict')):
            if isinstance(indicator, BaseModel):
                indicator_dict = indicator.dict(exclude_none=True); processed_indicators.append(indicator_dict)
            else: logger.warning(f"Object has 'dict' but not BaseModel: {type(indicator)}"); processed_indicators.append(indicator)
        elif isinstance(indicator, str): processed_indicators.append({"name": indicator})
        else: logger.debug(f"Indicator type not recognized: {type(indicator)}"); processed_indicators.append(indicator)
    final_indicators = []
    for i, item in enumerate(processed_indicators):
        if isinstance(item, dict) and 'name' in item: final_indicators.append(item)
        else: logger.error(f"Invalid indicator item at index {i}: {type(item)}. Skipping.")
    return final_indicators

# --- get_indicator_max_lookback function (Unchanged) ---
def get_indicator_max_lookback(indicator_dict: Dict) -> int:
    # ... (same implementation) ...
    name = indicator_dict.get("name", "").upper(); lookback = 0
    if name == "SMA" or name == "EMA" or name == "BOLLINGER BANDS" or name == "ATR": default = 14 if name == "ATR" else 20; lookback = indicator_dict.get("window", default)
    elif name == "MACD": lookback = indicator_dict.get("slow_window", 26)
    elif name == "RSI": lookback = indicator_dict.get("window", 14)
    elif name == "STOCHASTIC OSCILLATOR": lookback = indicator_dict.get("k_window", 14)
    elif name == "ICHIMOKU CLOUD": base_p = indicator_dict.get("base_period", 26); lagging_p = indicator_dict.get("lagging_span_b_period", 52); lookback = max(base_p, lagging_p)
    elif name == "VWAP" or name == "OBV": lookback = 0
    try: lookback = max(0, int(lookback))
    except (ValueError, TypeError): logger.warning(f"Invalid lookback value for {name}. Defaulting to 0."); lookback = 0
    return lookback

# --- calculate_date_range function (Unchanged) ---
def calculate_date_range(days: int, interval: str) -> tuple:
    # ... (same implementation) ...
    logical_end_date = date.today()
    calculated_start_date = logical_end_date - timedelta(days=days)
    now = datetime.now()
    limit_start_date_dt = None
    limit_days = YFINANCE_INTERVAL_LIMITS_DAYS.get(interval, float('inf'))
    if limit_days != float('inf'): limit_start_date_dt = now - timedelta(days=limit_days)
    final_start_date = calculated_start_date
    if limit_start_date_dt:
        limit_start_date_date = limit_start_date_dt.date()
        if calculated_start_date < limit_start_date_date: final_start_date = limit_start_date_date
    fetch_end_date = logical_end_date + timedelta(days=1)
    return final_start_date, fetch_end_date

# --- estimate_required_days_for_lookback function (Unchanged) ---
def estimate_required_days_for_lookback(periods: int, interval: str) -> int:
    # ... (same implementation) ...
    if interval.endswith('d') or interval.endswith('wk') or interval.endswith('mo'): return math.ceil(periods * 1.5)
    elif interval.endswith('h'): trading_periods_per_day = 7; return math.ceil(periods / trading_periods_per_day) + 5
    elif interval.endswith('m'): minutes = int(interval[:-1]); trading_periods_per_day = 390 / minutes; return math.ceil(periods / trading_periods_per_day) + 7
    else: return periods + 5

@app.post("/api/stocks/dashboard-data")
async def get_dashboard_data(request: DashboardDataRequest):
    """
    Unified endpoint. Returns partial data if chart generation fails due to interval limits.
    """
    ticker = request.ticker.strip().upper()
    if not ticker:
        # This is a fundamental error, return 400 immediately
        raise HTTPException(status_code=400, detail="Ticker symbol is required")

    logger.info(f"Processing dashboard request for ticker: {ticker}, display days: {request.days}, interval: {request.interval}")

    # --- Define the Chart Data Task ---
    async def get_chart_data(req_ticker, req_days, req_interval, req_indicators, req_chart_type):
        try:
            # 1A. Determine Max Lookback (in periods)
            processed_indicators = process_indicators(req_indicators)
            max_lookback_periods = 0
            indicator_requiring_max = ""
            current_company_name = get_company_name(req_ticker) # Get name early

            if processed_indicators:
                for indicator_dict in processed_indicators:
                    lookback = get_indicator_max_lookback(indicator_dict)
                    if lookback > max_lookback_periods:
                         max_lookback_periods = lookback
                         indicator_requiring_max = indicator_dict.get("name", "Unknown Indicator")
                logger.debug(f"Max lookback: {max_lookback_periods} periods ({indicator_requiring_max}) for interval {req_interval}")
            else:
                 logger.debug("No indicators requested.")

            # --- VALIDATION STEP ---
            if max_lookback_periods > 0:
                interval_limit_days = YFINANCE_INTERVAL_LIMITS_DAYS.get(req_interval, float('inf'))
                estimated_lookback_span_days = estimate_required_days_for_lookback(max_lookback_periods, req_interval)
                total_required_span_days = req_days + estimated_lookback_span_days

                logger.debug(f"Est. lookback days: {estimated_lookback_span_days}, Total required span: {total_required_span_days} days, Limit for '{req_interval}': {interval_limit_days} days")

                if total_required_span_days > interval_limit_days:
                    error_detail = (
                        f"Cannot fetch enough data for interval '{req_interval}' "
                        f"to calculate indicator '{indicator_requiring_max}' (needs ~{max_lookback_periods} periods / ~{estimated_lookback_span_days} lookback days) "
                        f"while displaying {req_days} days. "
                        f"Total required fetch span (~{total_required_span_days} days) exceeds the limit of {interval_limit_days} days for this interval. "
                        f"Suggest using a longer interval, reducing display period, or adjusting indicators."
                    )
                    logger.error(f"Interval/Lookback Conflict: {error_detail}")
                    # *** RETURN ERROR DICT INSTEAD OF RAISING EXCEPTION ***
                    return {
                        "error": "Interval/Lookback Conflict", # Short error key
                        "message": error_detail,               # Detailed message
                        "chart": None,
                        "company_name": current_company_name,
                        "indicators": processed_indicators,
                    }
            # --- END VALIDATION STEP ---


            # 1B. Calculate Extended Date Range
            total_days_to_fetch = req_days + estimate_required_days_for_lookback(max_lookback_periods, req_interval)
            total_days_to_fetch = min(total_days_to_fetch, 3650) # Cap fetch duration

            # logger.debug(f"Calculating fetch range for {total_days_to_fetch} days")
            extended_start_date, fetch_end_date = calculate_date_range(total_days_to_fetch, req_interval)
            original_start_date, _ = calculate_date_range(req_days, req_interval)
            logical_end_date = fetch_end_date - timedelta(days=1)

            # logger.debug(f"Fetch Range: {extended_start_date} to {fetch_end_date}")
            # logger.debug(f"Display Range: {original_start_date} to {logical_end_date}")

            # 1C. Fetch Extended Data
            stock_data = fetch_stock_data([req_ticker], extended_start_date, fetch_end_date, req_interval)

            if not stock_data or req_ticker not in stock_data or stock_data[req_ticker].empty:
                clamped_msg = ""
                clamped_limit = YFINANCE_INTERVAL_LIMITS_DAYS.get(req_interval, float('inf'))
                if clamped_limit != float('inf') and (date.today() - extended_start_date).days >= clamped_limit -1 :
                    clamped_msg = f" (Note: Data fetch may be limited by the {clamped_limit}-day history constraint for the '{req_interval}' interval)."
                logger.warning(f"No trading data found for {req_ticker}.{clamped_msg}")
                return {
                    "error": "No Trading Data",
                    "message": f"No trading data found for {req_ticker} in the specified range/interval.{clamped_msg}",
                    "chart": None,
                    "company_name": current_company_name,
                    "indicators": processed_indicators,
                }

            # 1D. Pass Extended Data to Analyzer
            ticker_data = stock_data[req_ticker]
            # logger.debug(f"Fetched {len(ticker_data)} data points for {req_ticker}.")

            # --- Secondary Check & Warning Prep ---
            min_points_needed = max_lookback_periods + 1
            actual_points_fetched = len(ticker_data)
            warning_message = None
            if actual_points_fetched < min_points_needed and max_lookback_periods > 0:
                warning_message = (
                    f"Warning: Indicator calculations might be inaccurate. "
                    f"Fetched {actual_points_fetched} data points, but indicator '{indicator_requiring_max}' "
                    f"requires at least {min_points_needed} for full accuracy due to data history limits "
                    f"for the '{req_interval}' interval."
                )
                logger.warning(warning_message)
            # --- End secondary check ---

            fig = analyze_ticker(
                req_ticker, ticker_data, processed_indicators, req_interval, req_chart_type
            )

            # 1E. Filter Trace Data (In-Place)
            try:
                start_range_dt = datetime.combine(original_start_date, datetime.min.time())
                end_range_dt = datetime.combine(logical_end_date, datetime.max.time())
                actual_data_start_dt = ticker_data.index.min()
                actual_data_start_dt_naive = actual_data_start_dt.replace(tzinfo=None) if isinstance(actual_data_start_dt, pd.Timestamp) else pd.to_datetime(actual_data_start_dt).replace(tzinfo=None)
                start_range_dt_naive = start_range_dt.replace(tzinfo=None)
                if start_range_dt_naive < actual_data_start_dt_naive: start_range_dt = actual_data_start_dt_naive
                else: start_range_dt = start_range_dt_naive
                end_range_dt = end_range_dt.replace(tzinfo=None)

                # logger.info(f"Filtering trace data to range: {start_range_dt} to {end_range_dt}")

                if fig.data:
                    traces_to_keep = []
                    original_trace_count = len(fig.data)
                    for trace in fig.data:
                        if hasattr(trace, 'x') and trace.x is not None and len(trace.x) > 0:
                            original_len = len(trace.x)
                            try:
                                if isinstance(trace.x[0], (datetime, pd.Timestamp)): x_series = pd.Series(pd.to_datetime(trace.x, errors='coerce')).dt.tz_localize(None)
                                else: x_series = pd.to_datetime(pd.Series(trace.x), errors='coerce').dt.tz_localize(None)
                                mask = (x_series >= start_range_dt) & (x_series <= end_range_dt) & (x_series.notna())
                                num_filtered = mask.sum()
                                if num_filtered > 0:
                                    trace.x = tuple(x_series[mask].tolist())
                                    if hasattr(trace, 'y') and trace.y is not None and len(trace.y) == original_len: trace.y = tuple(pd.Series(trace.y)[mask].tolist())
                                    if isinstance(trace, go.Candlestick):
                                        if hasattr(trace, 'open') and trace.open is not None and len(trace.open) == original_len: trace.open = tuple(pd.Series(trace.open)[mask].tolist())
                                        if hasattr(trace, 'high') and trace.high is not None and len(trace.high) == original_len: trace.high = tuple(pd.Series(trace.high)[mask].tolist())
                                        if hasattr(trace, 'low') and trace.low is not None and len(trace.low) == original_len: trace.low = tuple(pd.Series(trace.low)[mask].tolist())
                                        if hasattr(trace, 'close') and trace.close is not None and len(trace.close) == original_len: trace.close = tuple(pd.Series(trace.close)[mask].tolist())
                                    traces_to_keep.append(trace)
                            except Exception as trace_filter_err: logger.warning(f"Filter error trace '{getattr(trace, 'name', 'Unnamed')}': {trace_filter_err}"); traces_to_keep.append(trace)
                        else: traces_to_keep.append(trace)
                    fig.data = tuple(traces_to_keep)
                    # logger.debug(f"Filtering complete. {len(fig.data)} traces remaining.")
                fig.update_yaxes(autorange=True)

            except Exception as filter_err: logger.exception(f"Filter/cleanup error: {filter_err}")

            # Successful chart generation
            final_chart_data = {
                "chart": fig.to_json(),
                "company_name": current_company_name,
                "indicators": processed_indicators,
            }
            if warning_message:
                final_chart_data["warning"] = warning_message # Add warning if generated

            return final_chart_data

        # Catch ALL exceptions within the task and return an error dict
        except Exception as e:
            logger.exception(f"Unhandled exception in get_chart_data for {req_ticker}: {str(e)}")
            # Try to get company name even on failure
            try: failed_company_name = get_company_name(req_ticker)
            except Exception: failed_company_name = f"{req_ticker} (Name lookup failed)"
            return {
                "error": f"Internal Chart Error: {str(e)}",
                "chart": None,
                "company_name": failed_company_name,
                "indicators": process_indicators(req_indicators), # Show what was requested
            }
    # --- End Chart Data Task Definition ---


    # --- Define Other Tasks (KPI, Market Hours, Company Info) ---
    async def get_kpi_data(req_ticker, req_groups, req_timeframe, req_cache):
         try:
            kpi_result = get_kpis(req_ticker, req_groups, req_timeframe, req_cache)
            return {"kpi_data": kpi_result}
         except Exception as e: logger.exception(f"KPI Error: {e}"); return {"error": f"KPI Error: {e}"}

    async def get_market_hours_data(req_ticker):
         try:
            market_status = market_hours_tracker.get_market_status(req_ticker)
            next_change = market_status.get("next_state_change"); current_time = market_status.get("current_time")
            return { "is_market_open": market_status.get("is_market_open"), "exchange": market_status.get("exchange"), "next_state": market_status.get("next_state"), "next_state_change": next_change.isoformat() if isinstance(next_change, (datetime, pd.Timestamp)) else None, "seconds_until_change": market_status.get("seconds_until_change"),"current_time": current_time.isoformat() if isinstance(current_time, (datetime, pd.Timestamp)) else None }
         except Exception as e: logger.exception(f"Market Hours Error: {e}"); return {"error": f"Market Hours Error: {e}"}

    async def get_company_info_data(req_ticker):
         try:
            company_info = get_company_info(req_ticker); return { "name": getattr(company_info, 'Name', 'N/A'), "sector": getattr(company_info, 'Sector', 'N/A'), "industry": getattr(company_info, 'Industry', 'N/A'), "country": getattr(company_info, 'Country', 'N/A'), "website": getattr(company_info, 'Website', 'N/A') }
         except Exception as e: logger.exception(f"Company Info Error: {e}"); return {"error": f"Company Info Error: {e}"}

    # --- Execute Tasks Concurrently ---
    try:
        tasks = [
            asyncio.create_task(get_chart_data(ticker, request.days, request.interval, request.indicators, request.chart_type)),
            asyncio.create_task(get_kpi_data(ticker, request.kpi_groups, request.kpi_timeframe, request.use_cache)),
            asyncio.create_task(get_market_hours_data(ticker)),
            asyncio.create_task(get_company_info_data(ticker))
        ]
        # Use return_exceptions=True to prevent gather from stopping on the first error
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results, checking for exceptions or error structures
        chart_result = results[0]
        kpi_result = results[1]
        market_hours_result = results[2]
        company_info_result = results[3]

        # Log if any task returned an exception unexpectedly (should be caught within tasks now)
        if isinstance(chart_result, Exception): logger.error(f"Unhandled exception escaped get_chart_data: {chart_result}"); chart_result = {"error": "Internal server error generating chart."}
        if isinstance(kpi_result, Exception): logger.error(f"Unhandled exception escaped get_kpi_data: {kpi_result}"); kpi_result = {"error": "Internal server error fetching KPIs."}
        if isinstance(market_hours_result, Exception): logger.error(f"Unhandled exception escaped get_market_hours_data: {market_hours_result}"); market_hours_result = {"error": "Internal server error fetching market hours."}
        if isinstance(company_info_result, Exception): logger.error(f"Unhandled exception escaped get_company_info_data: {company_info_result}"); company_info_result = {"error": "Internal server error fetching company info."}

        # Assemble final response
        response = {
            "ticker": ticker,
            "timestamp": datetime.now().isoformat(),
            "chart_data": chart_result, # This will contain the error dict if chart failed
            "kpi_data": kpi_result,
            "market_hours": market_hours_result,
            "company_info": company_info_result
        }

        # Always return 200 OK, errors are embedded in the response sections
        status_code = 200
        if isinstance(chart_result, dict) and 'error' in chart_result:
            logger.warning(f"Chart generation for {ticker} failed or has warnings: {chart_result.get('error')}. Returning 200 OK with details.")

        return JSONResponse(content=response, status_code=status_code)

    # Catch fundamental errors before task creation/gathering
    except Exception as e:
        logger.exception(f"Critical error during dashboard data task setup or gathering for {ticker}: {str(e)}")
        # Return 500 for unexpected errors during setup
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error while processing dashboard request: {str(e)}"}
        )


# --- Health Check and Global Exception Handler (Unchanged) ---
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "stock-analysis-api"}

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        from fastapi.exception_handlers import http_exception_handler
        return await http_exception_handler(request, exc) # Let FastAPI handle HTTP exceptions
    logger.exception(f"Unhandled exception during request to {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: An unexpected error occurred."}
    )

# --- Main execution block (Unchanged) ---
if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server directly...")
    if not logger.hasHandlers():
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger(__name__)
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
    uvicorn.run("stock_api:app", host="0.0.0.0", port=8000, reload=True)