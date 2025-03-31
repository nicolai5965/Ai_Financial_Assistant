
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
    
    # Format the value
    formatted_value_obj = format_kpi_value(
        current_price,
        "price",
        {"decimal_places": 2, "currency": "$"}
    )

    # Create description
    description = (
        f"**What it is:** The most recent price at which {ticker} traded.\\n"
        f"**Trading Use:** Base indicator for current market valuation and entry/exit points.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** Reflects the latest market consensus on the stock's value."
    )

    # Return the formatted KPI
    return {
        "name": "Current Price",
        "value": formatted_value_obj,
        "description": description,
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
    change_direction = "neutral"
    change_interpretation = "No significant change from previous close."
    
    if current_price is not None and previous_close is not None:
        price_change = current_price - previous_close
        percent_change = price_change / previous_close if previous_close != 0 else 0
        
        logger.debug(f"Price change for {ticker}: {price_change} ({percent_change:.2%})")

        if percent_change > 0.001: # Threshold for positive change
            change_direction = "positive"
            change_interpretation = f"{ticker} is currently trading higher than its previous closing price."
        elif percent_change < -0.001: # Threshold for negative change
            change_direction = "negative"
            change_interpretation = f"{ticker} is currently trading lower than its previous closing price."
        else:
             change_interpretation = f"{ticker} is trading very close to its previous closing price."

    else:
        logger.warning(f"Could not calculate price changes for {ticker}")
        change_interpretation = "Could not calculate change due to missing data."
    
    # Format values
    formatted_price_change = format_kpi_value(
        price_change,
        "price",
        {"decimal_places": 2, "currency": "$", "show_color": True}
    )
    formatted_percent_change = format_kpi_value(
        percent_change,
        "percentage",
        {"decimal_places": 2, "show_color": True}
    )

    # Create descriptions
    price_change_desc = (
        f"**What it is:** The absolute difference between the current price and the previous day's closing price for {ticker}.\\n"
        f"**Trading Use:** Shows the nominal gain or loss since the last close.\\n"
        f"**Current Data:** {formatted_price_change['formatted_value'] if formatted_price_change else 'N/A'}\\n"
        f"**Interpretation:** {change_interpretation}"
    )
    percent_change_desc = (
        f"**What it is:** The price change expressed as a percentage of the previous day's closing price for {ticker}.\\n"
        f"**Trading Use:** Standardizes the price movement, allowing comparison across stocks.\\n"
        f"**Current Data:** {formatted_percent_change['formatted_value'] if formatted_percent_change else 'N/A'}\\n"
        f"**Interpretation:** {change_interpretation}"
    )

    # Return the formatted KPIs
    return [
        {
            "name": "Price Change",
            "value": formatted_price_change,
            "description": price_change_desc,
            "group": "price"
        },
        {
            "name": "Percentage Change",
            "value": formatted_percent_change,
            "description": percent_change_desc,
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
    
    # Format values
    formatted_day_high = format_kpi_value(
        day_high,
        "price",
        {"decimal_places": 2, "currency": "$"}
    )
    formatted_day_low = format_kpi_value(
        day_low,
        "price",
        {"decimal_places": 2, "currency": "$"}
    )

    # Create descriptions
    day_high_desc = (
        f"**What it is:** The highest price {ticker} reached during the current trading session.\\n"
        f"**Trading Use:** Indicates the session's peak buying interest or resistance level.\\n"
        f"**Current Data:** {formatted_day_high['formatted_value'] if formatted_day_high else 'N/A'}\\n"
        f"**Interpretation:** Represents the upper boundary of today's price action so far."
    )
    day_low_desc = (
        f"**What it is:** The lowest price {ticker} reached during the current trading session.\\n"
        f"**Trading Use:** Indicates the session's lowest selling point or support level.\\n"
        f"**Current Data:** {formatted_day_low['formatted_value'] if formatted_day_low else 'N/A'}\\n"
        f"**Interpretation:** Represents the lower boundary of today's price action so far."
    )

    # Return the formatted KPIs
    return [
        {
            "name": "Day's High",
            "value": formatted_day_high,
            "description": day_high_desc,
            "group": "price"
        },
        {
            "name": "Day's Low",
            "value": formatted_day_low,
            "description": day_low_desc,
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
    
    # Format value
    formatted_open_price = format_kpi_value(
        open_price,
        "price",
        {"decimal_places": 2, "currency": "$"}
    )

    # Create description
    description = (
        f"**What it is:** The price at which {ticker} first traded when the market opened for the current session.\\n"
        f"**Trading Use:** Sets the initial tone for the day; used to gauge opening sentiment compared to previous close.\\n"
        f"**Current Data:** {formatted_open_price['formatted_value'] if formatted_open_price else 'N/A'}\\n"
        f"**Interpretation:** Provides the starting point for today's price movements."
    )

    # Return the formatted KPI
    return {
        "name": "Open Price",
        "value": formatted_open_price,
        "description": description,
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
    
    # Format value
    formatted_previous_close = format_kpi_value(
        previous_close,
        "price",
        {"decimal_places": 2, "currency": "$"}
    )

    # Create description
    description = (
        f"**What it is:** The official closing price of {ticker} from the previous trading day.\\n"
        f"**Trading Use:** Key reference point for calculating daily changes and gauging overnight sentiment.\\n"
        f"**Current Data:** {formatted_previous_close['formatted_value'] if formatted_previous_close else 'N/A'}\\n"
        f"**Interpretation:** Represents the market's settled valuation at the end of the last session."
    )

    # Return the formatted KPI
    return {
        "name": "Previous Close",
        "value": formatted_previous_close,
        "description": description,
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