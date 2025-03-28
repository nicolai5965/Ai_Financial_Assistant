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
    safe_calculation,
    get_timeframe_display,
    enforce_minimum_timeframe
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
    
    # Log the result
    if week_52_high is not None and week_52_low is not None:
        logger.debug(f"52-week high/low for {ticker}: High={week_52_high}, Low={week_52_low}")
    else:
        logger.warning(f"Could not retrieve 52-week high/low for {ticker}")
    
    # Format values
    formatted_high_obj = format_kpi_value(
        week_52_high, "price", {"currency": "$"}
    )
    formatted_pct_high_obj = format_kpi_value(
        pct_from_high, "percentage", {"show_sign": True, "reverse_color": True}
    )
    formatted_low_obj = format_kpi_value(
        week_52_low, "price", {"currency": "$"}
    )
    formatted_pct_low_obj = format_kpi_value(
        pct_from_low, "percentage", {"show_sign": True}
    )

    # High Descriptions
    high_description = (
        f"**What it is:** The highest trading price for {ticker} over the past 52 weeks.\\n"
        f"**Trading Use:** Used to gauge the upper boundary of recent price action and potential resistance levels.\\n"
        f"**Current Data:** {formatted_high_obj['formatted_value'] if formatted_high_obj else 'N/A'}\\n"
        f"**Interpretation:** Represents the peak price investors were willing to pay in the last year."
    )
    pct_high_description = (
        f"**What it is:** The percentage difference between the current price and the 52-week high for {ticker}.\\n"
        f"**Trading Use:** Shows how far the stock has fallen from its peak. Can indicate potential for rebound or continued weakness.\\n"
        f"**Current Data:** {formatted_pct_high_obj['formatted_value'] if formatted_pct_high_obj else 'N/A'}\\n"
        f"**Interpretation:** A value close to 0% means the stock is near its yearly high; a large negative value means it's far below."
    )

    # Low Descriptions
    low_description = (
        f"**What it is:** The lowest trading price for {ticker} over the past 52 weeks.\\n"
        f"**Trading Use:** Used to gauge the lower boundary of recent price action and potential support levels.\\n"
        f"**Current Data:** {formatted_low_obj['formatted_value'] if formatted_low_obj else 'N/A'}\\n"
        f"**Interpretation:** Represents the floor price investors encountered in the last year."
    )
    pct_low_description = (
        f"**What it is:** The percentage difference between the current price and the 52-week low for {ticker}.\\n"
        f"**Trading Use:** Shows how much the stock has risen from its bottom. Can indicate strength or potential for pullback.\\n"
        f"**Current Data:** {formatted_pct_low_obj['formatted_value'] if formatted_pct_low_obj else 'N/A'}\\n"
        f"**Interpretation:** A value close to 0% means the stock is near its yearly low; a large positive value means it has significantly recovered."
    )
    
    # Return the formatted KPIs
    return [
        {
            "name": "52-Week High",
            "value": formatted_high_obj,
            "description": high_description,
            "group": "volatility"
        },
        {
            "name": "Distance from 52-Week High",
            "value": formatted_pct_high_obj,
            "description": pct_high_description,
            "group": "volatility"
        },
        {
            "name": "52-Week Low",
            "value": formatted_low_obj,
            "description": low_description,
            "group": "volatility"
        },
        {
            "name": "Distance from 52-Week Low",
            "value": formatted_pct_low_obj,
            "description": pct_low_description,
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
        timeframe: Timeframe to analyze (default: "1y") - will be enforced to minimum "1mo"
        window_days: Rolling window size in days (default: 20)
        
    Returns:
        Dictionary with historical volatility KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Enforce a minimum timeframe for volatility calculation
    min_timeframe = "1mo"
    volatility_timeframe = enforce_minimum_timeframe(timeframe, min_timeframe, "Historical Volatility")
    
    # Fetch historical data
    history = fetch_ticker_history(ticker, timeframe=volatility_timeframe)
    
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
    
    # Get human-readable timeframe display for the actual timeframe used
    timeframe_display = get_timeframe_display(volatility_timeframe)

    # Format the value
    formatted_value_obj = format_kpi_value(
        volatility, "percentage", {"decimal_places": 2}
    )

    # Create description
    interpretation = "Could not calculate volatility."
    if volatility is not None:
        if volatility > 0.5: # Example threshold for high volatility
            interpretation = f"The stock exhibits high volatility ({formatted_value_obj['formatted_value']}), suggesting significant price swings."
        elif volatility > 0.2: # Example threshold for moderate volatility
            interpretation = f"The stock shows moderate volatility ({formatted_value_obj['formatted_value']}), with noticeable price fluctuations."
        else:
            interpretation = f"The stock displays relatively low volatility ({formatted_value_obj['formatted_value']}), indicating more stable price movements."

    description = (
        f"**What it is:** A statistical measure of the dispersion of returns for {ticker}, calculated as the annualized standard deviation of daily log returns using a {window_days}-day rolling window over the past {timeframe_display}.\\n"
        f"**Trading Use:** Helps assess the risk associated with the stock. Higher volatility implies larger price swings and potentially higher risk/reward.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** {interpretation}"
    )
    
    # Return the formatted KPI
    return {
        "name": f"{window_days}-Day Historical Volatility",
        "value": formatted_value_obj,
        "description": description,
        "group": "volatility"
    }

@safe_calculation
def get_beta(ticker: str, timeframe: str = "1y") -> Dict[str, Any]:
    """
    Calculate the beta KPI for a ticker.
    
    Beta measures the volatility of a stock relative to the overall market.
    Beta calculations require substantial historical data to be statistically valid.
    Yahoo Finance typically calculates beta over a 5-year period using monthly data.
    
    Args:
        ticker: The ticker symbol
        timeframe: Timeframe to analyze (default: "1y") - will be enforced to minimum "5y" if calculated manually
        
    Returns:
        Dictionary with beta KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Beta requires substantial historical data to be meaningful
    # Use 5 years for consistency with Yahoo Finance when calculating manually
    beta_timeframe = "5y"  # Use 5 years for beta calculation
    
    # First check if beta is available from Yahoo Finance
    info = fetch_ticker_info(ticker)
    beta = info.get('beta')
    
    # Variable to track data source for the description
    beta_source = "Yahoo Finance"  # Default source when available from Yahoo Finance
    
    # If not available from Yahoo Finance, calculate it from historical data
    if beta is None:
        beta_source = "calculated"  # Update source to indicate manual calculation
        
        # Fetch historical data for the ticker and market index using 5-year timeframe
        ticker_history = fetch_ticker_history(ticker, timeframe=beta_timeframe)
        market_history = fetch_ticker_history(MARKET_INDEX, timeframe=beta_timeframe)
        
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
        logger.debug(f"Using beta from Yahoo Finance for {ticker}: {beta}")
    
    # Always use the enforced timeframe for the description if calculated
    timeframe_display = get_timeframe_display(beta_timeframe)

    # Format the value
    formatted_value_obj = format_kpi_value(
        beta, "number", {"decimal_places": 2, "show_color": True, "reverse_color": False}
    )

    # Create interpretation based on beta value
    interpretation = "Beta could not be determined."
    if beta is not None:
        if beta > 1.2:
            interpretation = f"The stock ({beta:.2f}) is significantly more volatile than the overall market ({MARKET_INDEX})."
        elif beta > 0.8:
            interpretation = f"The stock ({beta:.2f}) tends to move with the market, exhibiting similar volatility."
        elif beta >= 0:
            interpretation = f"The stock ({beta:.2f}) is less volatile than the overall market."
        else: # Beta < 0
            interpretation = f"The stock ({beta:.2f}) tends to move inversely to the overall market."

    # Create description based on data source
    source_text = f"(Source: {beta_source}, typically based on {timeframe_display} data)"
    if beta_source == "calculated":
        source_text = f"(Calculated using {timeframe_display} data vs {MARKET_INDEX})"

    description = (
        f"**What it is:** A measure of {ticker}'s price volatility in relation to the overall market (represented by {MARKET_INDEX}). {source_text}\\n"
        f"**Trading Use:** Helps understand systematic risk. Beta > 1 suggests higher volatility than the market, < 1 suggests lower. Negative Beta indicates inverse movement.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** {interpretation}"
    )
    
    # Return the formatted KPI with timeframe in the description
    return {
        "name": "Beta",
        "value": formatted_value_obj,
        "description": description,
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
        timeframe: Timeframe to analyze (default: "1mo") - will be enforced to minimum "1mo"
        window_days: ATR window size in days (default: 14)
        
    Returns:
        Dictionary with ATR KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Enforce a minimum timeframe for ATR calculation
    min_timeframe = "1mo"
    atr_timeframe = enforce_minimum_timeframe(timeframe, min_timeframe, "ATR")
    
    # Fetch historical data
    history = fetch_ticker_history(ticker, timeframe=atr_timeframe)
    
    atr = None
    atr_percentage = None
    
    if not history.empty and len(history) > window_days:
        # Calculate True Range
        history['High-Low'] = history['High'] - history['Low']
        history['High-PrevClose'] = abs(history['High'] - history['Close'].shift(1))
        history['Low-PrevClose'] = abs(history['Low'] - history['Close'].shift(1))
        
        history['TR'] = history[['High-Low', 'High-PrevClose', 'Low-PrevClose']].max(axis=1)
        
        # Use Wilder's smoothing method for ATR calculation
        # First ATR is simple average of first n periods
        first_tr = history['TR'].iloc[1:window_days+1].mean() # Corrected initial calculation start
        
        # Rest use the Wilder's smoothing formula
        atr_values = [np.nan] * window_days + [first_tr]
        
        for i in range(window_days + 1, len(history)):
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
        
        logger.debug(f"ATR ({window_days}-day) for {ticker}: {atr:.4f} ({atr_percentage:.2f}% of price if atr_percentage is not None else 'N/A')")
    else:
        logger.warning(f"Not enough historical data for ATR calculation for {ticker}")
    
    # Get human-readable timeframe display for the actual timeframe used
    timeframe_display = get_timeframe_display(atr_timeframe)

    # Format the value
    formatted_value_obj = format_kpi_value(
        atr, "price", {"currency": "$"}
    )
    formatted_pct_obj = format_kpi_value(
        atr_percentage, "percentage", {"decimal_places": 2}
    )

    # Create interpretation
    interpretation = "ATR could not be calculated."
    if atr is not None and atr_percentage is not None:
        interpretation = (
            f"On average, {ticker} has moved {formatted_value_obj['formatted_value']} per day over the last {window_days} days. "
            f"This represents about {formatted_pct_obj['formatted_value']} of its current price, indicating its typical daily price range."
        )
    elif atr is not None:
         interpretation = (
            f"On average, {ticker} has moved {formatted_value_obj['formatted_value']} per day over the last {window_days} days. "
            f"Percentage relative to price could not be calculated."
        )

    # Create description
    description = (
        f"**What it is:** The Average True Range ({window_days}-day) measures market volatility by decomposing the entire range of an asset price for that period. Calculated using Wilder's smoothing over {timeframe_display} data.\\n"
        f"**Trading Use:** Helps set stop-loss orders and target prices. Higher ATR suggests wider stops are needed due to greater volatility.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'} ({formatted_pct_obj['formatted_value'] if formatted_pct_obj else 'N/A'} of current price)\\n"
        f"**Interpretation:** {interpretation}"
    )
    
    # Return the formatted KPI with timeframe in the description
    return {
        "name": f"{window_days}-Day ATR",
        "value": formatted_value_obj,
        "description": description,
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
        timeframe: Timeframe to analyze (default: "1mo") - will be enforced to minimum "1mo"
        window_days: Bollinger Band window size in days (default: 20)
        
    Returns:
        Dictionary with Bollinger Band Width KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Enforce a minimum timeframe for Bollinger Band calculation
    min_timeframe = "1mo"
    bb_timeframe = enforce_minimum_timeframe(timeframe, min_timeframe, "Bollinger Bands")
    
    # Fetch historical data
    history = fetch_ticker_history(ticker, timeframe=bb_timeframe)
    
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
    
    # Get human-readable timeframe display for the actual timeframe used
    timeframe_display = get_timeframe_display(bb_timeframe)

    # Format the value
    formatted_value_obj = format_kpi_value(
        bb_width, "percentage", {"decimal_places": 2}
    )

    # Create interpretation
    interpretation = "Bollinger Band Width could not be calculated."
    # Example thresholds - these might need tuning based on typical ranges for stocks
    if bb_width is not None:
        # Comparing current width to its recent history might be more useful
        # For now, just provide context on what the value means
        if bb_width > 0.15: # Example threshold for wide bands
            interpretation = f"The bands are relatively wide ({formatted_value_obj['formatted_value']}), suggesting high recent volatility."
        elif bb_width < 0.05: # Example threshold for narrow bands (the Squeeze)
            interpretation = f"The bands are narrow ({formatted_value_obj['formatted_value']}), indicating low recent volatility, possibly preceding a larger price move (the Squeeze)."
        else:
            interpretation = f"The bands show moderate width ({formatted_value_obj['formatted_value']}), reflecting average recent volatility."

    # Create description
    description = (
        f"**What it is:** Measures the difference between the Upper and Lower Bollinger Bands relative to the Middle Band ({window_days}-day SMA) over the past {timeframe_display} for {ticker}.\\n"
        f"**Trading Use:** Identifies periods of high/low volatility. Narrowing width (a Squeeze) can signal an impending significant price move. Widening suggests increasing volatility.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** {interpretation}"
    )
    
    # Return the formatted KPI
    return {
        "name": "Bollinger Band Width",
        "value": formatted_value_obj,
        "description": description,
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
    
    # Beta calculation - always uses its own enforced timeframe internally
    beta = get_beta(ticker)
    
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
