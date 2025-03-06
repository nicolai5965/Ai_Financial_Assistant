import yfinance as yf
import pandas as pd
import plotly.graph_objects as go
import tempfile
import os
import json
from datetime import datetime, timedelta, time
from dotenv import load_dotenv
from ..services.llm.llm_handler import LLMHandler
from ..core.logging_config import get_logger


import pytz  # for timezone handling

logger = get_logger()

def fetch_stock_data(tickers, start_date, end_date, interval):
    """
    Fetch historical stock data for each ticker using the yf.Ticker object.
    
    Parameters:
        tickers (list): List of ticker symbols (e.g., ['AAPL', 'MSFT']).
        start_date (date): The start date for fetching historical data.
        end_date (date): The end date for fetching historical data.
        interval (str): Data interval (e.g., '1d', '5m', '1m'). Note: The 'end' date is exclusive.
        
    Returns:
        dict: A dictionary mapping each ticker to its fetched DataFrame.
        
    Logging:
        Logs the start and result of each ticker's data fetch.
    """
    stock_data = {}
    for ticker in tickers:
        logger.info("Fetching data for %s from %s to %s with interval %s...", ticker, start_date, end_date, interval)
        try:
            ticker_obj = yf.Ticker(ticker)
            data = ticker_obj.history(start=start_date, end=end_date, interval=interval)
            if not data.empty:
                stock_data[ticker] = data
                logger.info("Data fetched for %s: %d rows.", ticker, data.shape[0])
            else:
                logger.warning("No data found for %s.", ticker)
        except Exception as e:
            logger.exception("Error fetching data for %s: %s", ticker, str(e))
    if stock_data:
        logger.info("Stock data loaded successfully for: %s", ", ".join(stock_data.keys()))
    else:
        logger.error("No stock data loaded for any tickers.")
    return stock_data

def filter_market_hours(ticker, data):
    """
    Filter the DataFrame to include only rows within the trading hours of the stock's market.
    
    This function:
      1. Retrieves the exchange information for the ticker.
      2. Uses a predefined mapping of exchanges to their local trading hours and time zones.
      3. Converts the DataFrame index (timestamps) to the market's local time.
      4. Filters out rows outside the market's open and close times.
    
    Parameters:
        ticker (str): The stock ticker symbol.
        data (DataFrame): The historical data DataFrame with a DateTime index.
        
    Returns:
        DataFrame: The filtered DataFrame containing only rows during trading hours.
        
    Logging:
        Logs the exchange used for filtering and warnings if the exchange is not recognized.
    """
    try:
        ticker_obj = yf.Ticker(ticker)
        exchange = ticker_obj.info.get("exchange", None)
    except Exception as e:
        logger.exception("Error retrieving exchange info for %s: %s", ticker, str(e))
        return data

    # Mapping of exchanges to their trading hours and corresponding time zones.
    market_hours = {
        # U.S. markets (Nasdaq and NYSE)
        "NMS": {"timezone": "US/Eastern", "open": time(9, 30), "close": time(16, 0)},
        "NYQ": {"timezone": "US/Eastern", "open": time(9, 30), "close": time(16, 0)},
        # Example: Danish market (Nasdaq Copenhagen)
        "CPH": {"timezone": "Europe/Copenhagen", "open": time(9, 0), "close": time(17, 0)},
    }
    
    if exchange not in market_hours:
        logger.warning("Exchange '%s' not recognized for %s. Skipping market hours filtering.", exchange, ticker)
        return data

    market_info = market_hours[exchange]
    market_tz = market_info["timezone"]

    # Convert timestamps to the market's local time.
    if data.index.tzinfo is None or data.index.tz is None:
        data = data.tz_localize("UTC").tz_convert(market_tz)
        logger.debug("Localizing timestamps to UTC and converting to %s for %s.", market_tz, ticker)
    else:
        data = data.tz_convert(market_tz)
        logger.debug("Converting timestamps to %s for %s.", market_tz, ticker)

    # Filter rows based on whether they fall within trading hours.
    open_time = market_info["open"]
    close_time = market_info["close"]
    filtered_data = data[(data.index.time >= open_time) & (data.index.time <= close_time)]
    logger.info("After filtering, %s has %d rows during market hours.", ticker, filtered_data.shape[0])
    return filtered_data

def analyze_ticker(ticker, data, indicators, interval):
    """
    Build a candlestick chart with technical indicators for the given ticker.
    Also configures the x-axis with rangebreaks to remove non-trading periods (e.g., after-hours, weekends).
    
    Parameters:
        ticker (str): The stock ticker symbol.
        data (DataFrame): The filtered historical data for the ticker.
        indicators (list): A list of technical indicators to add (e.g., ['20-Day SMA']).
        interval (str): Data interval (used to decide whether to apply rangebreaks).
        
    Returns:
        Figure: A Plotly figure object containing the candlestick chart and overlays.
        
    Logging:
        Logs the progress of chart creation and any issues with rangebreak configuration.
    """
    logger.info("Analyzing %s...", ticker)
    # Build the basic candlestick chart.
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

    # Function to add a specific technical indicator to the chart.
    def add_indicator(indicator):
        try:
            if indicator == "20-Day SMA":
                sma = data['Close'].rolling(window=20).mean()
                fig.add_trace(go.Scatter(x=data.index, y=sma, mode='lines', name='SMA (20)'))
                logger.debug("Added 20-Day SMA for %s.", ticker)
            elif indicator == "20-Day EMA":
                ema = data['Close'].ewm(span=20).mean()
                fig.add_trace(go.Scatter(x=data.index, y=ema, mode='lines', name='EMA (20)'))
                logger.debug("Added 20-Day EMA for %s.", ticker)
            elif indicator == "20-Day Bollinger Bands":
                sma = data['Close'].rolling(window=20).mean()
                std = data['Close'].rolling(window=20).std()
                bb_upper = sma + 2 * std
                bb_lower = sma - 2 * std
                fig.add_trace(go.Scatter(x=data.index, y=bb_upper, mode='lines', name='BB Upper'))
                fig.add_trace(go.Scatter(x=data.index, y=bb_lower, mode='lines', name='BB Lower'))
                logger.debug("Added 20-Day Bollinger Bands for %s.", ticker)
            elif indicator == "VWAP":
                data['VWAP'] = (data['Close'] * data['Volume']).cumsum() / data['Volume'].cumsum()
                fig.add_trace(go.Scatter(x=data.index, y=data['VWAP'], mode='lines', name='VWAP'))
                logger.debug("Added VWAP for %s.", ticker)
        except Exception as e:
            logger.exception("Error adding indicator '%s' for %s: %s", indicator, ticker, str(e))

    for ind in indicators:
        add_indicator(ind)

    # If using intraday intervals, apply x-axis rangebreaks to remove gaps (weekends and after-hours).
    if interval not in ["1d", "1mo", "1wk"]:
        try:
            ticker_obj = yf.Ticker(ticker)
            exchange = ticker_obj.info.get("exchange", None)
            # Same mapping used earlier in filtering.
            market_hours = {
                "NMS": {"timezone": "US/Eastern", "open": time(9, 30), "close": time(16, 0)},
                "NYQ": {"timezone": "US/Eastern", "open": time(9, 30), "close": time(16, 0)},
                "CPH": {"timezone": "Europe/Copenhagen", "open": time(9, 0), "close": time(17, 0)},
            }
            if exchange in market_hours:
                m_info = market_hours[exchange]
                # Convert open and close times to numeric values for the x-axis.
                open_numeric = m_info["open"].hour + m_info["open"].minute / 60.0
                close_numeric = m_info["close"].hour + m_info["close"].minute / 60.0

                # Configure rangebreaks to remove weekends and non-trading hours.
                fig.update_xaxes(
                    rangebreaks=[
                        dict(bounds=["sat", "mon"]),  # Remove weekends.
                        dict(bounds=[close_numeric, open_numeric], pattern="hour")  # Remove after-hours gap.
                    ]
                )
                logger.debug("Applied rangebreaks for %s: open at %s, close at %s.", ticker, open_numeric, close_numeric)
            else:
                logger.warning("Exchange '%s' not recognized for rangebreaks for %s.", exchange, ticker)
        except Exception as e:
            logger.exception("Error configuring rangebreaks for %s: %s", ticker, str(e))
    
    # Hide the default range slider and add a title.
    fig.update_layout(xaxis_rangeslider_visible=False, title=f"Candlestick Chart for {ticker}")
    return fig

def main():
    """
    Main function to:
      - Parse configuration settings.
      - Validate and adjust the date range based on interval limitations.
      - Fetch stock data.
      - Filter data to include only trading hours.
      - Build and display candlestick charts with technical indicators.
    
    Logging:
      Logs configuration details, warnings if limits are exceeded, and errors during processing.
    """
    # Centralized configuration dictionary.
    config = {
        "tickers": "AAPL",        # Comma-separated ticker symbols.
        "date_range_days": 10,    # Number of days to look back.
        "interval": "5m",         # Data interval (e.g., '1d', '1h', '5m', '1m')
                                  # Interval limitations:
                                  # '1m': last 7 days
                                  # '2m', '5m', '15m', '30m', '60m', '90m': last 60 days
                                  # '1h': last 730 days
                                  # '1d', '5d', '1wk', '1mo', '3mo': max
        "technical_indicators": ["20-Day SMA"]
    }
    
    # Define maximum allowed days for specific intervals.
    interval_max_days = {
        "1m": 7,
        "2m": 60,
        "5m": 60,
        "15m": 60,
        "30m": 60,
        "60m": 60,
        "90m": 60,
        "1h": 730
        # For intervals like '1d', '5d', etc., we assume no enforced limit.
    }
    
    # Validate if the chosen date_range_days exceeds the maximum allowed for the given interval.
    interval = config["interval"]
    if interval in interval_max_days:
        max_allowed = interval_max_days[interval]
        if config["date_range_days"] > max_allowed:
            logger.warning("For interval '%s', maximum days allowed is %d. Adjusting date_range_days from %d to %d.",
                           interval, max_allowed, config["date_range_days"], max_allowed)
            config["date_range_days"] = max_allowed

    # Parse tickers from configuration.
    tickers = [ticker.strip().upper() for ticker in config["tickers"].split(",") if ticker.strip()]
    
    # Set up the date range: subtract date_range_days from today for the start.
    # Note: We add one day to the end_date so that today's data is included 
    # because yfinance treats the end date as exclusive.
    end_date_default = datetime.today()
    start_date_default = end_date_default - timedelta(days=config["date_range_days"])
    start_date = start_date_default.date()
    end_date = (end_date_default + timedelta(days=1)).date()

    logger.info("Configuration: %s", config)
    logger.info("Fetching data from %s to %s.", start_date, end_date)

    # Fetch stock data for the configured tickers.
    stock_data = fetch_stock_data(tickers, start_date, end_date, config["interval"])
    if not stock_data:
        logger.error("No stock data available. Exiting.")
        return

    # Process each ticker: filter for market hours, build the chart, and display it.
    for ticker, data in stock_data.items():
        filtered_data = filter_market_hours(ticker, data)
        if filtered_data.empty:
            logger.warning("No trading data for %s during market hours. Skipping chart generation.", ticker)
            continue

        fig = analyze_ticker(ticker, filtered_data, config["technical_indicators"], config["interval"])
        # Display the interactive plot.
        fig.show()
        logger.info("Displayed chart for %s.", ticker)

if __name__ == "__main__":
    main()
    

