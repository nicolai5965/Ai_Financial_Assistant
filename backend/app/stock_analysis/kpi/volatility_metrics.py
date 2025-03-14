"""
Volatility-related KPI calculations.

This module provides functions for retrieving and calculating volatility-related
KPIs for a given stock ticker, including 52-week high/low, historical volatility,
beta, and Average True Range (ATR).
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

# Market index ticker (S&P 500)
MARKET_INDEX = "^GSPC"

@safe_calculation
def get_52_week_high_low(ticker: str) -> List[Dict[str, Any]]:
    """
    Get the 52-week high and low price KPIs for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        List of dictionaries with 52-week high/low KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get the 52-week high and low
    week_52_high = info.get('fiftyTwoWeekHigh')
    week_52_low = info.get('fiftyTwoWeekLow')
    
    # Calculate percentage from current price
    current_price = info.get('currentPrice') or info.get('regularMarketPrice')
    
    pct_from_high = None
    pct_from_low = None
    
    if week_52_high is not None and current_price is not None:
        pct_from_high = (current_price - week_52_high) / week_52_high if week_52_high != 0 else 0
        
    if week_52_low is not None and current_price is not None:
        pct_from_low = (current_price - week_52_low) / week_52_low if week_52_low != 0 else 0
    
    if week_52_high is not None and week_52_low is not None:
        logger.debug(f"52-week high/low for {ticker}: High={week_52_high}, Low={week_52_low}")
    else:
        logger.warning(f"Could not retrieve 52-week high/low for {ticker}")
    
    # Return the formatted KPIs
    return [
        {
            "name": "52-Week High",
            "value": format_kpi_value(
                week_52_high, 
                "price", 
                {"decimal_places": 2, "currency": "$"}
            ),
            "trend": pct_from_high,
            "trend_label": f"{pct_from_high*100:.1f}% from high" if pct_from_high is not None else None,
            "description": f"Highest price reached in the last 52 weeks for {ticker}",
            "group": "volatility"
        },
        {
            "name": "52-Week Low",
            "value": format_kpi_value(
                week_52_low, 
                "price", 
                {"decimal_places": 2, "currency": "$"}
            ),
            "trend": pct_from_low,
            "trend_label": f"{pct_from_low*100:.1f}% from low" if pct_from_low is not None else None,
            "description": f"Lowest price reached in the last 52 weeks for {ticker}",
            "group": "volatility"
        }
    ]

@safe_calculation
def get_historical_volatility(ticker: str, timeframe: str = "1y", window_days: int = 20) -> Dict[str, Any]:
    """
    Calculate historical volatility KPI for a ticker.
    
    Volatility is measured as the annualized standard deviation of daily returns.
    Follows methodology similar to Barchart's HV calculation.
    
    Args:
        ticker: The ticker symbol
        timeframe: Timeframe to analyze (default: "1y")
        window_days: Rolling window size in days (default: 20)
        
    Returns:
        Dictionary with historical volatility KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch historical data
    history = fetch_ticker_history(ticker, timeframe=timeframe)
    
    volatility = None
    
    if not history.empty:
        # Calculate natural log of daily returns (ln(today's close / yesterday's close))
        # This is the methodology used by most financial websites including Barchart
        history['LogReturns'] = np.log(history['Close'] / history['Close'].shift(1))
        
        # Calculate annualized volatility (standard deviation * sqrt(252))
        # 252 is the approximate number of trading days in a year
        if len(history) > window_days:
            # Get the most recent rolling volatility
            std_dev = history['LogReturns'].rolling(window=window_days).std().iloc[-1]
            # Annualize the volatility - multiply by sqrt(252) to get annual volatility
            volatility = std_dev * np.sqrt(252)
            
            logger.debug(f"Historical volatility ({window_days}-day) for {ticker}: {volatility:.4f}")
        else:
            # If we don't have enough data for rolling, calculate over all available data
            std_dev = history['LogReturns'].std()
            volatility = std_dev * np.sqrt(252)
            
            logger.debug(f"Historical volatility (full period) for {ticker}: {volatility:.4f}")
    else:
        logger.warning(f"No historical data available for volatility calculation for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": f"{window_days}-Day Historical Volatility",
        "value": format_kpi_value(
            volatility, 
            "percentage", 
            {"decimal_places": 2}
        ),
        "description": f"Annualized standard deviation of daily log returns over a {window_days}-day period for {ticker}",
        "group": "volatility"
    }

@safe_calculation
def get_beta(ticker: str, timeframe: str = "1y") -> Dict[str, Any]:
    """
    Calculate the beta KPI for a ticker.
    
    Beta measures the volatility of a stock relative to the overall market.
    
    Args:
        ticker: The ticker symbol
        timeframe: Timeframe to analyze (default: "1y")
        
    Returns:
        Dictionary with beta KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # First check if beta is available in ticker info
    info = fetch_ticker_info(ticker)
    beta = info.get('beta')
    
    # If not available, calculate it from historical data
    if beta is None:
        # Fetch historical data for the ticker and market index
        ticker_history = fetch_ticker_history(ticker, timeframe=timeframe)
        market_history = fetch_ticker_history(MARKET_INDEX, timeframe=timeframe)
        
        if not ticker_history.empty and not market_history.empty:
            # Align the dates
            common_dates = set(ticker_history.index).intersection(set(market_history.index))
            
            if common_dates:
                # Filter to common dates
                ticker_history = ticker_history.loc[list(common_dates)]
                market_history = market_history.loc[list(common_dates)]
                
                # Calculate daily returns
                ticker_returns = ticker_history['Close'].pct_change().dropna()
                market_returns = market_history['Close'].pct_change().dropna()
                
                # Further align the dates after calculating returns
                common_dates_returns = set(ticker_returns.index).intersection(set(market_returns.index))
                
                if common_dates_returns:
                    ticker_returns = ticker_returns.loc[list(common_dates_returns)]
                    market_returns = market_returns.loc[list(common_dates_returns)]
                    
                    # Calculate beta as the covariance divided by market variance
                    if len(ticker_returns) > 1 and market_returns.var() != 0:
                        beta = np.cov(ticker_returns, market_returns)[0, 1] / market_returns.var()
                        logger.debug(f"Calculated beta for {ticker}: {beta:.4f}")
                    else:
                        logger.warning(f"Not enough data points to calculate beta for {ticker}")
                else:
                    logger.warning(f"No common dates after calculating returns for {ticker} and market index")
            else:
                logger.warning(f"No common dates for {ticker} and market index")
        else:
            logger.warning(f"Could not fetch history for {ticker} or market index")
    else:
        logger.debug(f"Using beta from ticker info for {ticker}: {beta}")
    
    # Return the formatted KPI
    return {
        "name": "Beta",
        "value": format_kpi_value(
            beta, 
            "number", 
            {"decimal_places": 2, "show_color": True, "reverse_color": False}
        ),
        "description": f"Measure of {ticker}'s volatility relative to the market. Beta > 1 indicates more volatility than the market, Beta < 1 indicates less volatility.",
        "group": "volatility"
    }

@safe_calculation
def get_average_true_range(ticker: str, timeframe: str = "1mo", window_days: int = 14) -> Dict[str, Any]:
    """
    Calculate the Average True Range (ATR) KPI for a ticker.
    
    ATR is a volatility indicator that shows how much a stock price moves, on average, over a given time period.
    Using Wilder's smoothing method for improved accuracy, matching the methodology of financial sites like Barchart.
    
    Args:
        ticker: The ticker symbol
        timeframe: Timeframe to analyze (default: "1mo")
        window_days: ATR window size in days (default: 14)
        
    Returns:
        Dictionary with ATR KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch historical data
    history = fetch_ticker_history(ticker, timeframe=timeframe)
    
    atr = None
    
    if not history.empty and len(history) > window_days:
        # Calculate True Range
        history['High-Low'] = history['High'] - history['Low']
        history['High-PrevClose'] = abs(history['High'] - history['Close'].shift(1))
        history['Low-PrevClose'] = abs(history['Low'] - history['Close'].shift(1))
        
        history['TR'] = history[['High-Low', 'High-PrevClose', 'Low-PrevClose']].max(axis=1)
        
        # Use Wilder's smoothing method for ATR calculation
        # First ATR is simple average of first n periods
        first_tr = history['TR'].iloc[:window_days].mean()
        
        # Rest use the Wilder's smoothing formula
        atr_values = [np.nan] * (window_days - 1) + [first_tr]
        
        for i in range(window_days, len(history)):
            atr_values.append(
                (atr_values[-1] * (window_days - 1) + history['TR'].iloc[i]) / window_days
            )
        
        history['ATR'] = atr_values
        
        # Get the latest ATR value
        atr = history['ATR'].iloc[-1]
        
        # Get current price for context
        current_price = history['Close'].iloc[-1]
        
        # Calculate ATR as percentage of price
        atr_percentage = (atr / current_price) * 100 if current_price > 0 else None
        
        logger.debug(f"ATR ({window_days}-day) for {ticker}: {atr:.4f} ({atr_percentage:.2f}% of price)")
    else:
        logger.warning(f"Not enough historical data for ATR calculation for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": f"{window_days}-Day ATR",
        "value": format_kpi_value(
            atr, 
            "price", 
            {"decimal_places": 2, "currency": "$"}
        ),
        "description": f"Average True Range over {window_days} days for {ticker} using Wilder's smoothing. Higher values indicate greater volatility.",
        "group": "volatility"
    }

@safe_calculation
def get_bollinger_band_width(ticker: str, timeframe: str = "1mo", window_days: int = 20) -> Dict[str, Any]:
    """
    Calculate the Bollinger Band Width KPI for a ticker.
    
    Bollinger Band Width is a measure of volatility derived from the bands.
    Width = (Upper Band - Lower Band) / Middle Band
    
    Args:
        ticker: The ticker symbol
        timeframe: Timeframe to analyze (default: "1mo")
        window_days: Bollinger Band window size in days (default: 20)
        
    Returns:
        Dictionary with Bollinger Band Width KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch historical data
    history = fetch_ticker_history(ticker, timeframe=timeframe)
    
    bb_width = None
    
    if not history.empty and len(history) > window_days:
        # Calculate SMA (middle band)
        history['SMA'] = history['Close'].rolling(window=window_days).mean()
        
        # Calculate standard deviation
        history['StdDev'] = history['Close'].rolling(window=window_days).std()
        
        # Calculate Bollinger Bands
        history['UpperBand'] = history['SMA'] + (history['StdDev'] * 2)
        history['LowerBand'] = history['SMA'] - (history['StdDev'] * 2)
        
        # Calculate Bollinger Band Width
        history['BBWidth'] = (history['UpperBand'] - history['LowerBand']) / history['SMA']
        
        # Get the latest BB Width value
        bb_width = history['BBWidth'].iloc[-1]
        
        logger.debug(f"Bollinger Band Width for {ticker}: {bb_width:.4f}")
    else:
        logger.warning(f"Not enough historical data for Bollinger Band Width calculation for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": "Bollinger Band Width",
        "value": format_kpi_value(
            bb_width, 
            "percentage", 
            {"decimal_places": 2}
        ),
        "description": f"Bollinger Band Width for {ticker}. Higher values indicate greater volatility.",
        "group": "volatility"
    }

def get_all_volatility_metrics(ticker: str, timeframe: str = "1y") -> Dict[str, Any]:
    """
    Get all volatility-related KPIs for a ticker.
    
    Args:
        ticker: The ticker symbol
        timeframe: Timeframe for data (default: "1y")
        
    Returns:
        Dictionary with all volatility KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    logger.info(f"Fetching all volatility metrics for {ticker} with timeframe {timeframe}")
    
    # Get individual KPIs
    week_52_high_low = get_52_week_high_low(ticker)
    # Historical Volatility removed as requested
    beta = get_beta(ticker, timeframe)
    # ATR removed as requested
    # Bollinger Band Width removed as requested - not a good KPI for this use case
    
    # Combine into a group result
    metrics = []
    
    if week_52_high_low:
        metrics.extend(week_52_high_low)
    
    # Historical Volatility removed
    
    if beta:
        metrics.append(beta)
    
    # ATR removed
    
    # Bollinger Band Width KPI removed
    
    # Return organized result
    return {
        "group": "volatility",
        "title": "Volatility & Trend Metrics",
        "description": "Metrics related to price volatility and market trends",
        "metrics": metrics
    }
