"""
Price-related KPI calculations.

This module provides functions for retrieving and calculating price-related
KPIs for a given stock ticker, including current price, price changes,
day's high/low, open price, and previous close.
"""

from typing import Dict, Any, List, Optional, Union, Tuple
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from app.core.logging_config import get_logger
from app.stock_analysis.kpi.kpi_utils import (
    sanitize_ticker,
    fetch_ticker_info,
    fetch_ticker_history,
    format_kpi_value,
    safe_calculation
)

# Initialize the logger
logger = get_logger()

@safe_calculation
def get_current_price(ticker: str) -> Dict[str, Any]:
    """
    Get the current price KPI for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with current price KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get the current price
    current_price = info.get('currentPrice')
    
    # If currentPrice is not available, try regularMarketPrice
    if current_price is None:
        current_price = info.get('regularMarketPrice')
        
    # Log the result
    if current_price is not None:
        logger.debug(f"Current price for {ticker}: {current_price}")
    else:
        logger.warning(f"Could not retrieve current price for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": "Current Price",
        "value": format_kpi_value(
            current_price, 
            "price", 
            {"decimal_places": 2, "currency": "$"}
        ),
        "description": f"The latest trading price for {ticker}",
        "group": "price"
    }

@safe_calculation
def get_price_changes(ticker: str) -> List[Dict[str, Any]]:
    """
    Get price change and percentage change KPIs for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        List of dictionaries with price change KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get the current price and previous close
    current_price = info.get('currentPrice') or info.get('regularMarketPrice')
    previous_close = info.get('previousClose')
    
    # Calculate changes if we have both values
    price_change = None
    percent_change = None
    
    if current_price is not None and previous_close is not None:
        price_change = current_price - previous_close
        percent_change = price_change / previous_close if previous_close != 0 else 0
        
        logger.debug(f"Price change for {ticker}: {price_change} ({percent_change:.2%})")
    else:
        logger.warning(f"Could not calculate price changes for {ticker}")
    
    # Return the formatted KPIs
    return [
        {
            "name": "Price Change",
            "value": format_kpi_value(
                price_change, 
                "price", 
                {"decimal_places": 2, "currency": "$", "show_color": True}
            ),
            "description": f"Absolute price change from previous close for {ticker}",
            "group": "price"
        },
        {
            "name": "Percentage Change",
            "value": format_kpi_value(
                percent_change, 
                "percentage", 
                {"decimal_places": 2, "show_color": True}
            ),
            "description": f"Percentage price change from previous close for {ticker}",
            "group": "price"
        }
    ]

@safe_calculation
def get_day_high_low(ticker: str) -> List[Dict[str, Any]]:
    """
    Get day's high and low price KPIs for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        List of dictionaries with high/low price KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get the day's high and low
    day_high = info.get('dayHigh')
    day_low = info.get('dayLow')
    
    if day_high is not None and day_low is not None:
        logger.debug(f"Day high/low for {ticker}: High={day_high}, Low={day_low}")
    else:
        logger.warning(f"Could not retrieve day high/low for {ticker}")
    
    # Return the formatted KPIs
    return [
        {
            "name": "Day's High",
            "value": format_kpi_value(
                day_high, 
                "price", 
                {"decimal_places": 2, "currency": "$"}
            ),
            "description": f"Highest price reached during the current trading day for {ticker}",
            "group": "price"
        },
        {
            "name": "Day's Low",
            "value": format_kpi_value(
                day_low, 
                "price", 
                {"decimal_places": 2, "currency": "$"}
            ),
            "description": f"Lowest price reached during the current trading day for {ticker}",
            "group": "price"
        }
    ]

@safe_calculation
def get_open_price(ticker: str) -> Dict[str, Any]:
    """
    Get the open price KPI for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with open price KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get the open price
    open_price = info.get('open')
    
    if open_price is not None:
        logger.debug(f"Open price for {ticker}: {open_price}")
    else:
        logger.warning(f"Could not retrieve open price for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": "Open Price",
        "value": format_kpi_value(
            open_price, 
            "price", 
            {"decimal_places": 2, "currency": "$"}
        ),
        "description": f"Price at which {ticker} opened for the current trading day",
        "group": "price"
    }

@safe_calculation
def get_previous_close(ticker: str) -> Dict[str, Any]:
    """
    Get the previous close price KPI for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with previous close price KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get the previous close
    previous_close = info.get('previousClose')
    
    if previous_close is not None:
        logger.debug(f"Previous close for {ticker}: {previous_close}")
    else:
        logger.warning(f"Could not retrieve previous close for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": "Previous Close",
        "value": format_kpi_value(
            previous_close, 
            "price", 
            {"decimal_places": 2, "currency": "$"}
        ),
        "description": f"Closing price from the previous trading day for {ticker}",
        "group": "price"
    }

def get_all_price_metrics(ticker: str) -> Dict[str, Any]:
    """
    Get all price-related KPIs for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with all price-related KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    logger.info(f"Getting all price metrics for {ticker}")
    
    # Initialize the results list
    price_kpis = []
    
    # Get current price
    price_kpis.append(get_current_price(ticker))
    
    # Get price changes
    price_kpis.extend(get_price_changes(ticker))
    
    # Get day's high and low
    price_kpis.extend(get_day_high_low(ticker))
    
    # Get open price
    price_kpis.append(get_open_price(ticker))
    
    # Get previous close
    price_kpis.append(get_previous_close(ticker))
    
    # Filter out None values from any failed calculations
    price_kpis = [kpi for kpi in price_kpis if kpi is not None]
    
    # Return the results
    return {
        "group": "price",
        "title": "Real-Time Price Metrics",
        "description": f"Current and recent price information for {ticker}",
        "kpis": price_kpis
    }