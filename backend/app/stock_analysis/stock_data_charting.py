import plotly.graph_objects as go
import yfinance as yf
from datetime import time
from .stock_indicators import add_indicator_to_chart
from .stock_data_fetcher import get_market_hours
from ..core.logging_config import get_logger

logger = get_logger()

def build_candlestick_chart(ticker, data):
    """
    Build a basic candlestick chart for the given ticker.
    
    Parameters:
        ticker (str): The stock ticker symbol.
        data (DataFrame): The historical data for the ticker.
        
    Returns:
        go.Figure: A Plotly figure object containing the candlestick chart.
        
    Logging:
        Logs the creation of the chart.
    """
    try:
        fig = go.Figure(data=[
            go.Candlestick(
                x=data.index,
                open=data['Open'],
                high=data['High'],
                low=data['Low'],
                close=data['Close'],
                name="Candlestick"
            )
        ])
        logger.debug("Created candlestick chart for %s.", ticker)
        return fig
    except Exception as e:
        logger.exception("Error creating candlestick chart for %s: %s", ticker, str(e))
        return go.Figure()

def build_line_chart(ticker, data):
    """
    Build a basic line chart for the given ticker using closing prices.
    
    Parameters:
        ticker (str): The stock ticker symbol.
        data (DataFrame): The historical data for the ticker.
        
    Returns:
        go.Figure: A Plotly figure object containing the line chart.
        
    Logging:
        Logs the creation of the chart.
    """
    try:
        fig = go.Figure(data=[
            go.Scatter(
                x=data.index,
                y=data['Close'],
                mode='lines',
                name="Close Price"
            )
        ])
        logger.debug("Created line chart for %s.", ticker)
        return fig
    except Exception as e:
        logger.exception("Error creating line chart for %s: %s", ticker, str(e))
        return go.Figure()

def apply_rangebreaks(fig, ticker, data, interval):
    """
    Apply rangebreaks to the x-axis to remove gaps (weekends, after-hours) 
    if the interval is intraday.
    
    Parameters:
        fig (go.Figure): The Plotly figure to update.
        ticker (str): The stock ticker symbol.
        data (DataFrame): The historical data for the ticker.
        interval (str): Data interval.
        
    Returns:
        go.Figure: The updated Plotly figure.
        
    Logging:
        Logs the application of rangebreaks.
    """
    if interval in ["1d", "1mo", "1wk"]:
        logger.debug("Skipping rangebreaks for %s with interval %s.", ticker, interval)
        return fig

    try:
        market_info = get_market_hours(ticker)
        if market_info:
            open_time = market_info["open"]
            close_time = market_info["close"]
            open_numeric = open_time.hour + open_time.minute / 60.0
            close_numeric = close_time.hour + close_time.minute / 60.0
            fig.update_xaxes(
                rangebreaks=[
                    dict(bounds=["sat", "mon"]),  # Remove weekends
                    dict(bounds=[close_numeric, open_numeric], pattern="hour")  # Remove after-hours gap
                ]
            )
            logger.debug("Applied rangebreaks for %s: open at %s, close at %s.", ticker, open_numeric, close_numeric)
        else:
            logger.warning("Could not apply rangebreaks for %s due to missing market hours info.", ticker)
    except Exception as e:
        logger.exception("Error applying rangebreaks for %s: %s", ticker, str(e))
    return fig

def add_selected_indicators(fig, data, ticker, indicators):
    """
    Add selected technical indicators to the chart.
    
    Parameters:
        fig (go.Figure): The Plotly figure to update.
        data (DataFrame): The historical data for the ticker.
        ticker (str): The stock ticker symbol.
        indicators (list): List of indicator names to add.
        
    Returns:
        go.Figure: The updated Plotly figure.
        
    Logging:
        Logs the addition of indicators.
    """
    if not indicators:
        logger.debug("No indicators selected for %s.", ticker)
        return fig
        
    logger.info("Adding %d indicators to chart for %s: %s", len(indicators), ticker, ", ".join(indicators))
    for indicator in indicators:
        added = add_indicator_to_chart(fig, data, indicator, ticker)
        if not added:
            logger.warning("Failed to add indicator '%s' to chart for %s.", indicator, ticker)
    
    return fig

def analyze_ticker(ticker, data, indicators, interval, chart_type="candlestick"):
    """
    Build a chart with technical indicators for the given ticker.
    
    Parameters:
        ticker (str): The stock ticker symbol.
        data (DataFrame): The filtered historical data for the ticker.
        indicators (list): A list of technical indicators to add.
        interval (str): Data interval (used to decide whether to apply rangebreaks).
        chart_type (str): Chart type, either "candlestick" or "line". Default is "candlestick".
        
    Returns:
        go.Figure: A Plotly figure object containing the chart and overlays.
        
    Logging:
        Logs the progress of chart creation.
    """
    logger.info("Analyzing %s...", ticker)
    
    # Build the base chart based on the selected chart type
    if chart_type.lower() == "line":
        fig = build_line_chart(ticker, data)
    else:
        fig = build_candlestick_chart(ticker, data)
    
    # Apply rangebreaks for intraday intervals
    fig = apply_rangebreaks(fig, ticker, data, interval)
    
    # Add the selected technical indicators
    fig = add_selected_indicators(fig, data, ticker, indicators)
    
    # Update layout: hide the range slider and add a title
    fig.update_layout(
        xaxis_rangeslider_visible=False, 
        title=f"{chart_type.capitalize()} Chart for {ticker}"
    )
    
    logger.info("Analysis complete for %s.", ticker)
    return fig

def main():
    """
    Main function for testing the stock data charting functionality.
    
    This function:
      - Defines a test configuration.
      - Validates and adjusts the date range based on interval limitations.
      - Fetches and filters stock data.
      - Builds and displays the chart with the selected chart type and indicators.
    
    Logging:
      Logs configuration details and progress.
    """
    from datetime import datetime, timedelta
    from .stock_data_fetcher import fetch_stock_data
    
    # Centralized configuration dictionary for testing
    config = {
        "tickers": "AAPL",               # Comma-separated ticker symbols
        "date_range_days": 10,           # Number of days to look back
        "interval": "5m",                # Data interval (e.g., '1d', '1wk', '1mo', '1h', '5m', '1m')
        "technical_indicators": ["20-Day SMA"],  # List of indicators to display
        "chart_type": "line"             # "line" or "candlestick"
    }
    
    # Define maximum allowed days for specific intervals
    interval_max_days = {
        "1m": 7,
        "2m": 60,
        "5m": 60,
        "15m": 60,
        "30m": 60,
        "1h": 730
        # "1d", "1wk", and "1mo" have no maximum day limits
    }
    
    # Validate and adjust the date range if needed
    interval = config["interval"]
    if interval in interval_max_days:
        max_allowed = interval_max_days[interval]
        if config["date_range_days"] > max_allowed:
            logger.warning("For interval '%s', maximum days allowed is %d. Adjusting date_range_days from %d to %d.",
                           interval, max_allowed, config["date_range_days"], max_allowed)
            config["date_range_days"] = max_allowed

    # Parse tickers from configuration
    tickers = [ticker.strip().upper() for ticker in config["tickers"].split(",") if ticker.strip()]
    
    # Set up the date range
    end_date_default = datetime.today()
    start_date_default = end_date_default - timedelta(days=config["date_range_days"])
    start_date = start_date_default.date()
    end_date = (end_date_default + timedelta(days=1)).date()

    logger.info("Configuration: %s", config)
    logger.info("Fetching data from %s to %s.", start_date, end_date)

    # Fetch stock data
    stock_data = fetch_stock_data(tickers, start_date, end_date, config["interval"])
    if not stock_data:
        logger.error("No stock data available. Exiting.")
        return

    # Process each ticker
    for ticker, data in stock_data.items():
        if data.empty:
            logger.warning("No trading data for %s. Skipping chart generation.", ticker)
            continue

        fig = analyze_ticker(ticker, data, config["technical_indicators"], config["interval"], config["chart_type"])
        # Display the interactive plot
        fig.show()
        logger.info("Displayed chart for %s.", ticker)

if __name__ == "__main__":
    main()
