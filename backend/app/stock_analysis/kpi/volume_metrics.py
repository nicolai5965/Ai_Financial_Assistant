"""
Volume-related KPI calculations.

This module provides functions for retrieving and calculating volume-related
KPIs for a given stock ticker, including current volume, average volume,
and volume ratio.
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
    safe_calculation,
    format_volume
)

# Initialize the logger
logger = get_logger()

@safe_calculation
def get_current_volume(ticker: str) -> Dict[str, Any]:
    """
    Get the current trading volume KPI for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with current volume KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get the current volume
    current_volume = info.get('volume')
    
    # If volume is not available, try regularMarketVolume
    if current_volume is None:
        current_volume = info.get('regularMarketVolume')
        
    # Log the result
    if current_volume is not None:
        logger.debug(f"Current volume for {ticker}: {current_volume}")
    else:
        logger.warning(f"Could not retrieve current volume for {ticker}")
    
    # Format the value
    formatted_value_obj = format_kpi_value(
        current_volume,
        "volume",
        {}
    )

    # Create description
    description = (
        f"**What it is:** The total number of {ticker} shares traded during the current market session.\\n"
        f"**Trading Use:** Indicates the level of market activity and liquidity in the stock. High volume can confirm price trends.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** Shows the current trading intensity for {ticker}."
    )

    # Return the formatted KPI
    return {
        "name": "Current Volume",
        "value": formatted_value_obj,
        "description": description,
        "group": "volume"
    }

@safe_calculation
def get_average_volume(ticker: str, period_days: int = 30) -> Dict[str, Any]:
    """
    Get the average trading volume KPI for a ticker over a specific period.
    
    Args:
        ticker: The ticker symbol
        period_days: Number of days to average (default: 30)
        
    Returns:
        Dictionary with average volume KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info for the average volume from info
    info = fetch_ticker_info(ticker)
    
    # First try to get the average volume directly from info
    avg_volume = info.get('averageVolume')
    source = "Yahoo Finance"
    
    # If not available, calculate from historical data
    if avg_volume is None:
        source = "calculated"
        # Fetch historical data for the specified period
        history = fetch_ticker_history(ticker, timeframe=f"{period_days}d")
        
        if not history.empty:
            # Calculate average volume from the history
            avg_volume = history['Volume'].mean()
            logger.debug(f"Calculated average volume for {ticker} over {period_days} days: {avg_volume}")
        else:
            logger.warning(f"No historical data available to calculate average volume for {ticker}")
            avg_volume = None
    else:
        logger.debug(f"Using average volume from ticker info for {ticker}: {avg_volume}")
    
    # Format the value
    formatted_value_obj = format_kpi_value(
        avg_volume,
        "volume",
        {}
    )

    # Create description
    desc_period = f"{period_days}-Day"
    if period_days == 10:
        desc_period = "10-Day"
    elif period_days == 30:
        desc_period = "30-Day" # Common default

    source_info = f"(Source: {source})" if source == "calculated" else ""

    description = (
        f"**What it is:** The average number of {ticker} shares traded daily over the past {period_days} days. {source_info}\\n"
        f"**Trading Use:** Provides a baseline for normal trading activity. Helps identify unusual volume spikes.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** Represents the typical daily trading interest in {ticker} over the specified period."
    )

    # Return the formatted KPI
    return {
        "name": f"{desc_period} Average Volume",
        "value": formatted_value_obj,
        "description": description,
        "group": "volume"
    }

@safe_calculation
def get_volume_ratio(ticker: str) -> Dict[str, Any]:
    """
    Get the volume ratio KPI (current volume / average volume) for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with volume ratio KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get the current and average volume
    current_volume = info.get('volume') or info.get('regularMarketVolume')
    avg_volume = info.get('averageVolume')
    
    # Calculate ratio if both values are available
    volume_ratio = None
    interpretation = "Volume ratio could not be calculated."
    
    if current_volume is not None and avg_volume is not None and avg_volume != 0:
        volume_ratio = current_volume / avg_volume
        logger.debug(f"Volume ratio for {ticker}: {volume_ratio:.2f}")
        if volume_ratio > 2.0:
            interpretation = f"Today's volume is significantly higher than average ({volume_ratio:.2f}x), indicating strong interest or a potential catalyst."
        elif volume_ratio > 1.0:
            interpretation = f"Today's volume is higher than average ({volume_ratio:.2f}x), suggesting increased activity."
        elif volume_ratio < 0.8:
            interpretation = f"Today's volume is lower than average ({volume_ratio:.2f}x), suggesting reduced activity."
        else:
            interpretation = f"Today's volume is near the average level ({volume_ratio:.2f}x)."
    else:
        logger.warning(f"Could not calculate volume ratio for {ticker}")
    
    # Format the value
    formatted_value_obj = format_kpi_value(
        volume_ratio,
        "ratio",
        {"decimal_places": 2, "show_color": True}
    )

    # Create description
    description = (
        f"**What it is:** Compares the current session's volume to the average daily volume (usually 30-day) for {ticker}.\\n"
        f"**Trading Use:** Highlights unusual trading activity. Ratios > 1 indicate above-average volume, < 1 indicate below-average.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** {interpretation}"
    )

    # Return the formatted KPI
    return {
        "name": "Volume Ratio",
        "value": formatted_value_obj,
        "description": description,
        "group": "volume"
    }

@safe_calculation
def get_relative_volume(ticker: str, timeframe: str = "5d") -> Dict[str, Any]:
    """
    Get the relative volume KPI for a ticker.
    
    This compares today's volume to the same time of day average volume
    from previous trading days, providing a more time-accurate measure.
    
    Args:
        ticker: The ticker symbol
        timeframe: Timeframe to use for comparison (default: "5d")
        
    Returns:
        Dictionary with relative volume KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch historical data with intraday intervals
    history = fetch_ticker_history(ticker, timeframe=timeframe)
    
    relative_volume = None
    interpretation = "Relative volume could not be calculated."
    
    if not history.empty:
        # Get current date and previous dates
        dates = history.index.date.unique()
        
        if len(dates) > 1:
            current_date = max(dates)
            
            # Get current day's data and previous days' data
            current_day = history[history.index.date == current_date]
            
            if not current_day.empty:
                current_time = current_day.index[-1].time()
                
                # Calculate average volume at similar time on previous days
                similar_time_volumes = []
                
                for date in dates:
                    if date != current_date:
                        day_data = history[history.index.date == date]
                        
                        # Find the closest time point
                        if not day_data.empty:
                            time_diffs = [(abs((dt.time().hour * 3600 + dt.time().minute * 60) - 
                                              (current_time.hour * 3600 + current_time.minute * 60)), i) 
                                         for i, dt in enumerate(day_data.index)]
                            _, closest_idx = min(time_diffs)
                            similar_time_volumes.append(day_data.iloc[closest_idx]['Volume'])
                
                if similar_time_volumes:
                    avg_time_volume = sum(similar_time_volumes) / len(similar_time_volumes)
                    # Get cumulative volume up to the current time today
                    current_cumulative_volume = current_day['Volume'].iloc[-1]
                    
                    if avg_time_volume > 0:
                        relative_volume = current_cumulative_volume / avg_time_volume
                        logger.debug(f"Relative volume for {ticker}: {relative_volume:.2f}")
                        if relative_volume > 2.0:
                            interpretation = f"Volume so far today is significantly higher ({relative_volume:.2f}x) than average for this time of day, suggesting strong participation."
                        elif relative_volume > 1.0:
                            interpretation = f"Volume so far today is higher ({relative_volume:.2f}x) than average for this time of day."
                        elif relative_volume < 0.8:
                            interpretation = f"Volume so far today is lower ({relative_volume:.2f}x) than average for this time of day."
                        else:
                            interpretation = f"Volume so far today is near the average ({relative_volume:.2f}x) for this time of day."
                    else:
                        logger.warning(f"Average time volume is zero for {ticker}")
                        interpretation = "Average volume at this time of day was zero in the comparison period."
                else:
                    logger.warning(f"No similar time volumes found for {ticker}")
                    interpretation = "Could not find comparable volume data from previous days."
            else:
                logger.warning(f"No current day data available for {ticker}")
                interpretation = "No trading data available for today yet."
        else:
            logger.warning(f"Not enough historical dates for relative volume calculation for {ticker}")
            interpretation = "Not enough historical data to compare."
    else:
        logger.warning(f"No historical data available for relative volume calculation for {ticker}")
        interpretation = "Historical data could not be fetched."
    
    # Format the value
    formatted_value_obj = format_kpi_value(
        relative_volume,
        "ratio",
        {"decimal_places": 2, "show_color": True}
    )

    # Create description
    description = (
        f"**What it is:** Compares today's cumulative volume up to the current time with the average cumulative volume at the same time on previous days (using {timeframe} data).\\n"
        f"**Trading Use:** Provides a time-adjusted view of volume strength. High relative volume early in the day can signal strong interest.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** {interpretation}"
    )

    # Return the formatted KPI
    return {
        "name": "Relative Volume",
        "value": formatted_value_obj,
        "description": description,
        "group": "volume"
    }

def get_all_volume_metrics(ticker: str, timeframe: str = "1d") -> Dict[str, Any]:
    """
    Get all volume-related KPIs for a ticker.
    
    Args:
        ticker: The ticker symbol
        timeframe: Timeframe for data (default: "1d")
        
    Returns:
        Dictionary with all volume KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    logger.info(f"Fetching all volume metrics for {ticker} with timeframe {timeframe}")
    
    # Get individual KPIs
    current_volume = get_current_volume(ticker)
    avg_volume = get_average_volume(ticker)
    volume_ratio = get_volume_ratio(ticker)
    relative_volume = get_relative_volume(ticker, timeframe)
    
    # Combine into a group result
    metrics = []
    
    if current_volume:
        metrics.append(current_volume)
    
    if avg_volume:
        metrics.append(avg_volume)
    
    if volume_ratio:
        metrics.append(volume_ratio)
    
    if relative_volume:
        metrics.append(relative_volume)
    
    # Return organized result
    return {
        "group": "volume",
        "title": "Volume Metrics",
        "description": "Metrics related to trading volume and liquidity",
        "metrics": metrics
    }
