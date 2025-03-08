import plotly.graph_objects as go
import pandas as pd
from ..core.logging_config import get_logger

logger = get_logger()

def calculate_20day_SMA(data, ticker):
    """
    Calculate 20-Day Simple Moving Average and return a Plotly trace.
    
    Parameters:
        data (DataFrame): The stock price data DataFrame.
        ticker (str): The stock ticker symbol (for logging).
        
    Returns:
        go.Scatter: A Plotly scatter trace for the SMA line.
    """
    try:
        sma = data['Close'].rolling(window=20).mean()
        trace = go.Scatter(x=data.index, y=sma, mode='lines', name='SMA (20)')
        logger.debug("Calculated 20-Day SMA for %s.", ticker)
        return trace
    except Exception as e:
        logger.exception("Error calculating 20-Day SMA for %s: %s", ticker, str(e))
        return None

def calculate_20day_EMA(data, ticker):
    """
    Calculate 20-Day Exponential Moving Average and return a Plotly trace.
    
    Parameters:
        data (DataFrame): The stock price data DataFrame.
        ticker (str): The stock ticker symbol (for logging).
        
    Returns:
        go.Scatter: A Plotly scatter trace for the EMA line.
    """
    try:
        ema = data['Close'].ewm(span=20).mean()
        trace = go.Scatter(x=data.index, y=ema, mode='lines', name='EMA (20)')
        logger.debug("Calculated 20-Day EMA for %s.", ticker)
        return trace
    except Exception as e:
        logger.exception("Error calculating 20-Day EMA for %s: %s", ticker, str(e))
        return None

def calculate_20day_Bollinger_Bands(data, ticker):
    """
    Calculate 20-Day Bollinger Bands and return upper and lower band Plotly traces.
    
    Parameters:
        data (DataFrame): The stock price data DataFrame.
        ticker (str): The stock ticker symbol (for logging).
        
    Returns:
        tuple: A tuple containing (upper_band_trace, lower_band_trace).
    """
    try:
        sma = data['Close'].rolling(window=20).mean()
        std = data['Close'].rolling(window=20).std()
        bb_upper = sma + 2 * std
        bb_lower = sma - 2 * std
        
        upper_trace = go.Scatter(x=data.index, y=bb_upper, mode='lines', name='BB Upper')
        lower_trace = go.Scatter(x=data.index, y=bb_lower, mode='lines', name='BB Lower')
        
        logger.debug("Calculated 20-Day Bollinger Bands for %s.", ticker)
        return (upper_trace, lower_trace)
    except Exception as e:
        logger.exception("Error calculating 20-Day Bollinger Bands for %s: %s", ticker, str(e))
        return (None, None)

def calculate_VWAP(data, ticker):
    """
    Calculate Volume Weighted Average Price (VWAP) and return a Plotly trace.
    
    Parameters:
        data (DataFrame): The stock price data DataFrame.
        ticker (str): The stock ticker symbol (for logging).
        
    Returns:
        go.Scatter: A Plotly scatter trace for the VWAP line.
    """
    try:
        # Create a copy to avoid modifying the original DataFrame
        temp_data = data.copy()
        temp_data['VWAP'] = (data['Close'] * data['Volume']).cumsum() / data['Volume'].cumsum()
        
        trace = go.Scatter(x=data.index, y=temp_data['VWAP'], mode='lines', name='VWAP')
        logger.debug("Calculated VWAP for %s.", ticker)
        return trace
    except Exception as e:
        logger.exception("Error calculating VWAP for %s: %s", ticker, str(e))
        return None

def add_indicator_to_chart(fig, data, indicator_name, ticker):
    """
    Add a technical indicator to the provided Plotly figure.
    
    Parameters:
        fig (go.Figure): The Plotly figure to add the indicator to.
        data (DataFrame): The stock price data DataFrame.
        indicator_name (str): The name of the indicator to add.
        ticker (str): The stock ticker symbol.
        
    Returns:
        bool: True if the indicator was added successfully, False otherwise.
    """
    try:
        # Use a dictionary to map indicator names to their respective functions
        indicator_functions = {
            "20-Day SMA": calculate_20day_SMA,
            "20-Day EMA": calculate_20day_EMA,
            "20-Day Bollinger Bands": calculate_20day_Bollinger_Bands,
            "VWAP": calculate_VWAP
        }
        
        if indicator_name not in indicator_functions:
            logger.warning("Unknown indicator '%s' for %s. Skipping.", indicator_name, ticker)
            return False
            
        # Call the appropriate function based on the indicator name
        result = indicator_functions[indicator_name](data, ticker)
        
        # Handle the result based on the indicator type
        if indicator_name == "20-Day Bollinger Bands":
            upper_trace, lower_trace = result
            if upper_trace and lower_trace:
                fig.add_trace(upper_trace)
                fig.add_trace(lower_trace)
                return True
        else:
            if result:
                fig.add_trace(result)
                return True
                
        return False
    except Exception as e:
        logger.exception("Error adding indicator '%s' for %s: %s", indicator_name, ticker, str(e))
        return False 