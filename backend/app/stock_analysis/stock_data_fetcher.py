import yfinance as yf
import pandas as pd
from datetime import time
import pytz
from pydantic import BaseModel, Field
from ..core.logging_config import get_logger

logger = get_logger()

# Pydantic model for company info
class CompanyInfo(BaseModel):
    """
    Pydantic model for company information.
    
    Attributes:
        Name (str): Company name
        Sector (str): Company sector
        Industry (str): Company industry
        Country (str): Company country
        Website (str): Company website
    """
    Name: str = Field(..., description="Company name")
    Sector: str = Field(..., description="Company sector")
    Industry: str = Field(..., description="Company industry")
    Country: str = Field(..., description="Company country")
    Website: str = Field(..., description="Company website")

# Pydantic model for the Stock section
class Stock(BaseModel):
    """
    Pydantic model for stock information.
    
    Attributes:
        Company_Info (CompanyInfo): Company information
    """
    Company_Info: CompanyInfo

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

def get_company_name(ticker):
    """
    Get the company name for a given ticker symbol using yfinance.
    
    Parameters:
        ticker (str): The stock ticker symbol.
        
    Returns:
        str: The company name or the ticker symbol if not found.
        
    Logging:
        Logs any errors encountered during the process.
    """
    try:
        ticker = yf.Ticker(ticker)
        company_name = ticker.info.get('longName', ticker)
        logger.info(f"Retrieved company name for {ticker}: {company_name}")
        return company_name
    except Exception as e:
        logger.error(f"Error retrieving company name for {ticker}: {str(e)}")
        return ticker 

def get_company_info(ticker: str) -> CompanyInfo:
    """
    Get comprehensive company information for a given ticker.
    
    Parameters:
        ticker (str): The stock ticker symbol.
        
    Returns:
        CompanyInfo: A Pydantic model containing company information.
        
    Logging:
        Logs any errors encountered during the process.
    """
    try:
        logger.info(f"Fetching company info for {ticker}")
        ticker_obj = yf.Ticker(ticker)
        info = ticker_obj.info
        
        company_info = CompanyInfo(
            Name=info.get("shortName", info.get("longName", "N/A")),
            Sector=info.get("sector", "N/A"),
            Industry=info.get("industry", "N/A"),
            Country=info.get("country", "N/A"),
            Website=info.get("website", "N/A")
        )
        
        logger.info(f"Retrieved company info for {ticker}: {company_info}")
        return company_info
    except Exception as e:
        logger.exception(f"Error retrieving company info for {ticker}: {str(e)}")
        # Return minimal information with N/A values in case of an error
        return CompanyInfo(
            Name=ticker,
            Sector="N/A",
            Industry="N/A",
            Country="N/A",
            Website="N/A"
        ) 