"""
Utility functions for KPI calculations.

This module provides helper functions for standardizing KPI calculations,
formatting outputs, and handling errors consistently.
"""

from typing import Dict, Any, Optional, List, Union, Tuple
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import yfinance as yf

from app.core.logging_config import get_logger

# Initialize the logger
logger = get_logger()

def sanitize_ticker(ticker: str) -> str:
    """
    Sanitize ticker symbol by removing whitespace and converting to uppercase.
    
    Args:
        ticker: A ticker symbol
        
    Returns:
        Sanitized ticker symbol
    """
    if not ticker:
        raise ValueError("Ticker symbol cannot be empty")
    
    sanitized = ticker.strip().upper()
    logger.debug(f"Sanitized ticker: '{ticker}' -> '{sanitized}'")
    return sanitized

def format_percentage(value: float, decimal_places: int = 2) -> str:
    """
    Format a value as a percentage string.
    
    Args:
        value: The value to format (e.g., 0.0567)
        decimal_places: Number of decimal places to include
        
    Returns:
        Formatted percentage string (e.g., "5.67%")
    """
    try:
        # Yahoo Finance and other APIs already provide percentage values in their proper form
        # (i.e., dividend_yield is already 0.0346 for a 3.46% yield)
        formatted = f"{value * 100:.{decimal_places}f}%"
        return formatted
    except (TypeError, ValueError) as e:
        logger.warning(f"Failed to format percentage for value {value}: {str(e)}")
        return "N/A"

def format_currency(value: float, decimal_places: int = 2, currency: str = "$") -> str:
    """
    Format a value as a currency string.
    
    Args:
        value: The value to format
        decimal_places: Number of decimal places to include
        currency: Currency symbol to use
        
    Returns:
        Formatted currency string (e.g., "$123.45")
    """
    try:
        formatted = f"{currency}{value:,.{decimal_places}f}"
        return formatted
    except (TypeError, ValueError) as e:
        logger.warning(f"Failed to format currency for value {value}: {str(e)}")
        return "N/A"

def format_volume(value: float) -> str:
    """
    Format volume with appropriate suffix (K, M, B, T).
    
    Args:
        value: The volume value
        
    Returns:
        Formatted volume string (e.g., "1.5M")
    """
    try:
        if value is None:
            return "N/A"
        
        if value >= 1_000_000_000_000:
            return f"{value / 1_000_000_000_000:.2f}T"
        elif value >= 1_000_000_000:
            return f"{value / 1_000_000_000:.2f}B"
        elif value >= 1_000_000:
            return f"{value / 1_000_000:.2f}M"
        elif value >= 1_000:
            return f"{value / 1_000:.2f}K"
        else:
            return f"{value:.0f}"
    except (TypeError, ValueError) as e:
        logger.warning(f"Failed to format volume for value {value}: {str(e)}")
        return "N/A"

def safe_calculation(func):
    """
    Decorator for safely executing calculations and handling exceptions.
    
    Args:
        func: The function to decorate
        
    Returns:
        Wrapped function that handles exceptions
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            func_name = getattr(func, "__name__", "unknown")
            logger.error(f"Error in {func_name}: {str(e)}")
            return None
    return wrapper

def get_data_period(timeframe: str) -> str:
    """
    Convert timeframe to yfinance period parameter.
    
    Args:
        timeframe: Timeframe string (e.g., "1d", "5d", "1mo", "3mo", "6mo", "1y", "5y")
        
    Returns:
        Period string for yfinance
    """
    # Map common timeframes to yfinance periods
    timeframe_mapping = {
        "1d": "1d",
        "5d": "5d",
        "1wk": "1wk", 
        "1mo": "1mo",
        "3mo": "3mo",
        "6mo": "6mo",
        "1y": "1y",
        "5y": "5y",
        "max": "max"
    }
    
    # Default to 1d if not found
    period = timeframe_mapping.get(timeframe, "1d")
    logger.debug(f"Mapped timeframe '{timeframe}' to period '{period}'")
    return period

def get_data_interval(timeframe: str) -> str:
    """
    Determine appropriate interval based on timeframe.
    
    Args:
        timeframe: Timeframe string (e.g., "1d", "5d", "1mo", etc.)
        
    Returns:
        Interval string for yfinance
    """
    # Map timeframes to appropriate intervals
    interval_mapping = {
        "1d": "1m",      # For 1 day, use 1-minute data
        "5d": "5m",      # For 5 days, use 5-minute data
        "1wk": "15m",    # For 1 week, use 15-minute data
        "1mo": "1h",     # For 1 month, use hourly data
        "3mo": "1d",     # For 3 months, use daily data
        "6mo": "1d",     # For 6 months, use daily data
        "1y": "1d",      # For 1 year, use daily data
        "5y": "1wk",     # For 5 years, use weekly data
        "max": "1mo"     # For max period, use monthly data
    }
    
    # Default to daily if not found
    interval = interval_mapping.get(timeframe, "1d")
    logger.debug(f"Selected interval '{interval}' for timeframe '{timeframe}'")
    return interval

@safe_calculation
def fetch_ticker_info(ticker: str) -> Dict[str, Any]:
    """
    Fetch basic information about a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with ticker information
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Create a Ticker object
    ticker_obj = yf.Ticker(ticker)
    
    # Get the information dictionary
    info = ticker_obj.info
    
    # Return the info dictionary or an empty dict if None
    return info or {}

@safe_calculation
def fetch_ticker_history(ticker: str, timeframe: str = "1d") -> pd.DataFrame:
    """
    Fetch historical price data for a ticker.
    
    Args:
        ticker: The ticker symbol
        timeframe: Timeframe to fetch (e.g., "1d", "5d", "1mo", etc.)
        
    Returns:
        DataFrame with historical price data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Get period and interval from timeframe
    period = get_data_period(timeframe)
    interval = get_data_interval(timeframe)
    
    # Create a Ticker object and get history
    ticker_obj = yf.Ticker(ticker)
    history = ticker_obj.history(period=period, interval=interval)
    
    # Log the data size
    logger.debug(f"Fetched {len(history)} data points for {ticker} with period={period}, interval={interval}")
    
    return history

def format_kpi_value(value: Any, kpi_type: str, additional_params: Dict = None) -> Dict[str, Any]:
    """
    Format a KPI value with appropriate formatting based on KPI type.
    
    Args:
        value: The KPI value to format
        kpi_type: Type of KPI (e.g., "price", "percentage", "volume", etc.)
        additional_params: Additional parameters for formatting
        
    Returns:
        Dictionary with formatted KPI value and metadata
    """
    if additional_params is None:
        additional_params = {}
    
    # Default result with raw value
    result = {
        "raw_value": value,
        "formatted_value": "N/A",
        "type": kpi_type
    }
    
    # Return early if value is None
    if value is None:
        return result
    
    # Format based on type
    if kpi_type == "price":
        decimal_places = additional_params.get("decimal_places", 2)
        currency = additional_params.get("currency", "$")
        result["formatted_value"] = format_currency(value, decimal_places, currency)
    
    elif kpi_type == "percentage":
        decimal_places = additional_params.get("decimal_places", 2)
        # Yahoo Finance provides percentage values like 0.0346 for 3.46%
        result["formatted_value"] = format_percentage(value, decimal_places)
    
    elif kpi_type == "volume":
        result["formatted_value"] = format_volume(value)
    
    elif kpi_type == "ratio":
        decimal_places = additional_params.get("decimal_places", 2)
        result["formatted_value"] = f"{value:.{decimal_places}f}"
    
    elif kpi_type == "text":
        result["formatted_value"] = str(value)
    
    else:
        # Default formatting for unknown types
        try:
            result["formatted_value"] = str(value)
        except:
            result["formatted_value"] = "N/A"
    
    # Add any color indication (for positive/negative values)
    if additional_params.get("show_color", False):
        try:
            if float(value) > 0:
                result["color"] = "positive"
            elif float(value) < 0:
                result["color"] = "negative"
            else:
                result["color"] = "neutral"
        except:
            result["color"] = "neutral"
    
    return result