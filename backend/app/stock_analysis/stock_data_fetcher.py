import yfinance as yf
import pandas as pd
from datetime import time
import pytz
from ..core.logging_config import get_logger

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

def get_market_hours(ticker):
    """
    Get the market hours and timezone for a given ticker.
    
    Parameters:
        ticker (str): The stock ticker symbol.
        
    Returns:
        dict: Dictionary containing market hours information or None if not available.
    """
    try:
        ticker_obj = yf.Ticker(ticker)
        exchange = ticker_obj.info.get("exchange", None)
    except Exception as e:
        logger.exception("Error retrieving exchange info for %s: %s", ticker, str(e))
        return None

    # Mapping of exchanges to their trading hours and corresponding time zones.
    market_hours = {
        # U.S. markets (Nasdaq and NYSE)
        "NMS": {"timezone": "US/Eastern", "open": time(9, 30), "close": time(16, 0)},
        "NYQ": {"timezone": "US/Eastern", "open": time(9, 30), "close": time(16, 0)},
        # Example: Danish market (Nasdaq Copenhagen)
        "CPH": {"timezone": "Europe/Copenhagen", "open": time(9, 0), "close": time(17, 0)},
    }
    
    if exchange not in market_hours:
        logger.warning("Exchange '%s' not recognized for %s.", exchange, ticker)
        return None
        
    return {"exchange": exchange, **market_hours[exchange]} 