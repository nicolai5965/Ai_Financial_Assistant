import plotly.graph_objects as go
import pandas as pd
from ..core.logging_config import get_logger

logger = get_logger()

def determine_window_size(data, default_window=20):
    """
    Determine an appropriate window size for indicator calculations based on the available data.
    
    Parameters:
        data (DataFrame): The stock price data.
        default_window (int): The default window size.
        
    Returns:
        int: An adjusted window size.
    """
    available_points = len(data)
    # If available data is less than the default, use a smaller window (but at least 3 points)
    if available_points < default_window:
        window = max(3, available_points)
    else:
        window = default_window
    logger.debug("Using window size %d (default was %d, available points: %d)", window, default_window, available_points)
    return window

def calculate_SMA(data, ticker, window=None, default_window=20):
    """
    Calculate Simple Moving Average with dynamic or custom window size and return a Plotly trace.
    
    Parameters:
        data (DataFrame): The stock price data.
        ticker (str): The stock ticker symbol.
        window (int, optional): Custom window size to override the default.
        default_window (int): The default window size if no custom window is provided.
        
    Returns:
        go.Scatter: A Plotly scatter trace for SMA.
    """
    try:
        # Use custom window if provided, otherwise determine dynamically
        window_size = window if window is not None else determine_window_size(data, default_window)
        sma = data['Close'].rolling(window=window_size).mean()
        trace = go.Scatter(x=data.index, y=sma, mode='lines', name=f'SMA ({window_size})')
        logger.debug("Calculated SMA (%d) for %s.", window_size, ticker)
        return trace
    except Exception as e:
        logger.exception("Error calculating SMA for %s: %s", ticker, str(e))
        return None

def calculate_EMA(data, ticker, window=None, default_window=20):
    """
    Calculate Exponential Moving Average with dynamic or custom window size and return a Plotly trace.
    
    Parameters:
        data (DataFrame): The stock price data.
        ticker (str): The stock ticker symbol.
        window (int, optional): Custom window size to override the default.
        default_window (int): The default window size if no custom window is provided.
        
    Returns:
        go.Scatter: A Plotly scatter trace for EMA.
    """
    try:
        # Use custom window if provided, otherwise determine dynamically
        window_size = window if window is not None else determine_window_size(data, default_window)
        ema = data['Close'].ewm(span=window_size).mean()
        trace = go.Scatter(x=data.index, y=ema, mode='lines', name=f'EMA ({window_size})')
        logger.debug("Calculated EMA (%d) for %s.", window_size, ticker)
        return trace
    except Exception as e:
        logger.exception("Error calculating EMA for %s: %s", ticker, str(e))
        return None

def calculate_Bollinger_Bands(data, ticker, window=None, default_window=20, std_dev=2):
    """
    Calculate Bollinger Bands with dynamic or custom window size and return upper and lower band traces.
    
    Parameters:
        data (DataFrame): The stock price data.
        ticker (str): The stock ticker symbol.
        window (int, optional): Custom window size to override the default.
        default_window (int): The default window size if no custom window is provided.
        std_dev (int): Number of standard deviations for the bands (default: 2).
        
    Returns:
        tuple: (upper_trace, lower_trace) for Bollinger Bands.
    """
    try:
        # Use custom window if provided, otherwise determine dynamically
        window_size = window if window is not None else determine_window_size(data, default_window)
        sma = data['Close'].rolling(window=window_size).mean()
        std = data['Close'].rolling(window=window_size).std()
        bb_upper = sma + std_dev * std
        bb_lower = sma - std_dev * std
        
        upper_trace = go.Scatter(x=data.index, y=bb_upper, mode='lines', name=f'BB Upper ({window_size}, {std_dev}σ)')
        lower_trace = go.Scatter(x=data.index, y=bb_lower, mode='lines', name=f'BB Lower ({window_size}, {std_dev}σ)')
        
        logger.debug("Calculated Bollinger Bands (%d) for %s.", window_size, ticker)
        return (upper_trace, lower_trace)
    except Exception as e:
        logger.exception("Error calculating Bollinger Bands for %s: %s", ticker, str(e))
        return (None, None)

def calculate_VWAP(data, ticker):
    """
    Calculate Volume Weighted Average Price (VWAP) and return a Plotly trace.
    """
    try:
        temp_data = data.copy()
        temp_data['VWAP'] = (data['Close'] * data['Volume']).cumsum() / data['Volume'].cumsum()
        trace = go.Scatter(x=data.index, y=temp_data['VWAP'], mode='lines', name='VWAP')
        logger.debug("Calculated VWAP for %s.", ticker)
        return trace
    except Exception as e:
        logger.exception("Error calculating VWAP for %s: %s", ticker, str(e))
        return None


def calculate_RSI(data, ticker, window=None, default_window=14):
    """
    Calculate the Relative Strength Index (RSI) and return a Plotly trace.
    
    Parameters:
        data (DataFrame): The stock price data.
        ticker (str): The stock ticker symbol.
        window (int, optional): Custom window size to override the default.
        default_window (int): Default window size for RSI calculation.
        
    Returns:
        go.Scatter: A Plotly scatter trace for RSI.
    """
    try:
        # Use custom window if provided, otherwise determine dynamically
        window_size = window if window is not None else determine_window_size(data, default_window)
        delta = data['Close'].diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.rolling(window=window_size, min_periods=window_size).mean()
        avg_loss = loss.rolling(window=window_size, min_periods=window_size).mean()
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        trace = go.Scatter(x=data.index, y=rsi, mode='lines', name=f'RSI ({window_size})')
        logger.debug("Calculated RSI (%d) for %s.", window_size, ticker)
        return trace
    except Exception as e:
        logger.exception("Error calculating RSI for %s: %s", ticker, str(e))
        return None

def calculate_MACD(data, ticker, fast_window=None, slow_window=None, signal_window=None, 
                  default_fast_window=12, default_slow_window=26, default_signal_window=9):
    """
    Calculate the MACD and its signal line, returning Plotly traces for both.
    
    Parameters:
        data (DataFrame): The stock price data.
        ticker (str): The stock ticker symbol.
        fast_window (int, optional): Custom window size for the fast EMA.
        slow_window (int, optional): Custom window size for the slow EMA.
        signal_window (int, optional): Custom window size for the signal line.
        default_fast_window (int): Default window size for the fast EMA.
        default_slow_window (int): Default window size for the slow EMA.
        default_signal_window (int): Default window size for the signal line.
        
    Returns:
        tuple: (macd_trace, signal_trace)
    """
    try:
        # Use custom windows if provided, otherwise use defaults
        fast = fast_window if fast_window is not None else default_fast_window
        slow = slow_window if slow_window is not None else default_slow_window
        signal = signal_window if signal_window is not None else default_signal_window
        
        fast_ema = data['Close'].ewm(span=fast, adjust=False).mean()
        slow_ema = data['Close'].ewm(span=slow, adjust=False).mean()
        macd = fast_ema - slow_ema
        signal_line = macd.ewm(span=signal, adjust=False).mean()
        
        macd_trace = go.Scatter(x=data.index, y=macd, mode='lines', name=f'MACD ({fast}-{slow})')
        signal_trace = go.Scatter(x=data.index, y=signal_line, mode='lines', name=f'Signal ({signal})')
        
        logger.debug("Calculated MACD for %s with parameters: fast=%d, slow=%d, signal=%d.", 
                    ticker, fast, slow, signal)
        return (macd_trace, signal_trace)
    except Exception as e:
        logger.exception("Error calculating MACD for %s: %s", ticker, str(e))
        return (None, None)

def calculate_ATR(data, ticker, window=None, default_window=14):
    """
    Calculate the Average True Range (ATR) and return a Plotly trace.
    
    Parameters:
        data (DataFrame): The stock price data.
        ticker (str): The stock ticker symbol.
        window (int, optional): Custom window size to override the default.
        default_window (int): Default window size for ATR calculation.
        
    Returns:
        go.Scatter: A Plotly scatter trace for ATR.
    """
    try:
        # Use custom window if provided, otherwise determine dynamically
        window_size = window if window is not None else determine_window_size(data, default_window)
        
        high_low = data['High'] - data['Low']
        high_close = (data['High'] - data['Close'].shift()).abs()
        low_close = (data['Low'] - data['Close'].shift()).abs()
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        atr = true_range.rolling(window=window_size, min_periods=window_size).mean()
        
        trace = go.Scatter(x=data.index, y=atr, mode='lines', name=f'ATR ({window_size})')
        logger.debug("Calculated ATR (%d) for %s.", window_size, ticker)
        return trace
    except Exception as e:
        logger.exception("Error calculating ATR for %s: %s", ticker, str(e))
        return None

def calculate_OBV(data, ticker):
    """
    Calculate the On-Balance Volume (OBV) and return a Plotly trace.
    
    Parameters:
        data (DataFrame): The stock price data.
        ticker (str): The stock ticker symbol.
        
    Returns:
        go.Scatter: A Plotly scatter trace for OBV.
    """
    try:
        import numpy as np
        delta = data['Close'].diff()
        # Create an array where positive change gets volume, negative gets -volume, zero gets 0.
        obv_values = np.where(delta > 0, data['Volume'],
                              np.where(delta < 0, -data['Volume'], 0))
        obv = pd.Series(obv_values, index=data.index).cumsum()
        trace = go.Scatter(x=data.index, y=obv, mode='lines', name='OBV')
        logger.debug("Calculated OBV for %s.", ticker)
        return trace
    except Exception as e:
        logger.exception("Error calculating OBV for %s: %s", ticker, str(e))
        return None

def calculate_stochastic_oscillator(data, ticker, k_window=None, d_window=None, 
                                   default_k_window=14, default_d_window=3):
    """
    Calculate the Stochastic Oscillator (%K and %D) and return Plotly traces.
    
    Parameters:
        data (DataFrame): The stock price data.
        ticker (str): The stock ticker symbol.
        k_window (int, optional): Custom window size for %K calculation.
        d_window (int, optional): Custom window size for %D (moving average of %K).
        default_k_window (int): Default window size for %K calculation.
        default_d_window (int): Default window size for %D calculation.
        
    Returns:
        tuple: (k_trace, d_trace)
    """
    try:
        # Use custom windows if provided, otherwise use defaults
        k_size = k_window if k_window is not None else default_k_window
        d_size = d_window if d_window is not None else default_d_window
        
        low_min = data['Low'].rolling(window=k_size).min()
        high_max = data['High'].rolling(window=k_size).max()
        k_percent = 100 * ((data['Close'] - low_min) / (high_max - low_min))
        d_percent = k_percent.rolling(window=d_size).mean()
        
        k_trace = go.Scatter(x=data.index, y=k_percent, mode='lines', name=f'Stoch %K ({k_size})')
        d_trace = go.Scatter(x=data.index, y=d_percent, mode='lines', name=f'Stoch %D ({d_size})')
        
        logger.debug("Calculated Stochastic Oscillator for %s with %K=%d, %D=%d.", ticker, k_size, d_size)
        return (k_trace, d_trace)
    except Exception as e:
        logger.exception("Error calculating Stochastic Oscillator for %s: %s", ticker, str(e))
        return (None, None)

def calculate_ichimoku_cloud(data, ticker, conversion_period=None, base_period=None, lagging_span_b_period=None,
                            default_conversion_period=9, default_base_period=26, default_lagging_span_b_period=52):
    """
    Calculate Ichimoku Cloud components and return Plotly traces.
    
    Parameters:
        data (DataFrame): The stock price data.
        ticker (str): The stock ticker symbol.
        conversion_period (int, optional): Custom period for the Conversion Line (Tenkan-sen).
        base_period (int, optional): Custom period for the Base Line (Kijun-sen).
        lagging_span_b_period (int, optional): Custom period for the Lagging Span B.
        default_conversion_period (int): Default period for the Conversion Line.
        default_base_period (int): Default period for the Base Line.
        default_lagging_span_b_period (int): Default period for the Lagging Span B.
        
    Returns:
        tuple: (conversion_trace, base_trace, leading_span_a_trace, leading_span_b_trace)
    """
    try:
        # Use custom periods if provided, otherwise use defaults
        conv_period = conversion_period if conversion_period is not None else default_conversion_period
        base_p = base_period if base_period is not None else default_base_period
        lagging_p = lagging_span_b_period if lagging_span_b_period is not None else default_lagging_span_b_period
        
        conversion_line = (data['High'].rolling(window=conv_period).max() +
                          data['Low'].rolling(window=conv_period).min()) / 2
        base_line = (data['High'].rolling(window=base_p).max() +
                    data['Low'].rolling(window=base_p).min()) / 2
        leading_span_a = ((conversion_line + base_line) / 2).shift(base_p)
        leading_span_b = ((data['High'].rolling(window=lagging_p).max() +
                          data['Low'].rolling(window=lagging_p).min()) / 2).shift(base_p)
        
        conversion_trace = go.Scatter(x=data.index, y=conversion_line, mode='lines', 
                                     name=f'Ichimoku Conversion ({conv_period})')
        base_trace = go.Scatter(x=data.index, y=base_line, mode='lines', 
                               name=f'Ichimoku Base ({base_p})')
        leading_a_trace = go.Scatter(x=data.index, y=leading_span_a, mode='lines', 
                                    name=f'Ichimoku Leading A (shifted {base_p})')
        leading_b_trace = go.Scatter(x=data.index, y=leading_span_b, mode='lines', 
                                    name=f'Ichimoku Leading B (shifted {base_p})')
        
        logger.debug("Calculated Ichimoku Cloud for %s with parameters: conv=%d, base=%d, lagging=%d.", 
                    ticker, conv_period, base_p, lagging_p)
        return (conversion_trace, base_trace, leading_a_trace, leading_b_trace)
    except Exception as e:
        logger.exception("Error calculating Ichimoku Cloud for %s: %s", ticker, str(e))
        return (None, None, None, None)


def add_indicator_to_chart(fig, data, indicator_config, ticker, panel_idx=1):
    """
    Add a technical indicator to the provided Plotly figure.
    
    Parameters:
        fig (go.Figure): The Plotly figure to add the indicator to.
        data (DataFrame): The stock price data.
        indicator_config (str or dict or IndicatorConfig): Either a string with the indicator name or 
                                                         a dictionary/object with indicator name and parameters.
        ticker (str): The stock ticker symbol.
        panel_idx (int, optional): Index of the panel to add the indicator to (1-indexed). Default is 1.
        
    Returns:
        bool: True if the indicator was added successfully, False otherwise.
    """
    try:
        # Map indicator names to their respective functions
        indicator_functions = {
            "SMA": calculate_SMA,
            "EMA": calculate_EMA,
            "Bollinger Bands": calculate_Bollinger_Bands,
            "VWAP": calculate_VWAP,
            "RSI": calculate_RSI,
            "MACD": calculate_MACD,
            "ATR": calculate_ATR,
            "OBV": calculate_OBV,
            "Stochastic Oscillator": calculate_stochastic_oscillator,
            "Ichimoku Cloud": calculate_ichimoku_cloud
        }
        
        # Extract indicator name and parameters safely
        indicator_name = None
        params = {}
        
        # 1. Handle different indicator_config types
        if isinstance(indicator_config, str):
            # Simple string case
            indicator_name = indicator_config
        elif isinstance(indicator_config, dict):
            # Dictionary case - use get() safely
            indicator_name = indicator_config.get("name")
            # Copy all parameters except name and panel
            for key, value in indicator_config.items():
                if key not in ["name", "panel"] and value is not None:
                    params[key] = value
        elif hasattr(indicator_config, "name"):
            # Object with name attribute (like Pydantic model)
            indicator_name = indicator_config.name
            
            # Try to convert to dictionary if possible
            if hasattr(indicator_config, "dict") and callable(getattr(indicator_config, "dict")):
                try:
                    # This works for Pydantic models
                    config_dict = indicator_config.dict()
                    for key, value in config_dict.items():
                        if key not in ["name", "panel"] and value is not None:
                            params[key] = value
                except Exception as dict_error:
                    logger.warning(f"Could not convert indicator to dict: {dict_error}")
            
            # Fallback: extract attributes directly
            if not params:
                for attr_name in dir(indicator_config):
                    # Skip special attributes, methods, and name/panel
                    if (not attr_name.startswith('_') and 
                        attr_name not in ["name", "panel", "model_config", "model_fields"] and
                        not callable(getattr(indicator_config, attr_name))):
                        attr_value = getattr(indicator_config, attr_name)
                        if attr_value is not None:
                            params[attr_name] = attr_value
        else:
            logger.warning(f"Invalid indicator configuration format for {ticker}. Type: {type(indicator_config)}")
            return False
        
        # Verify we got a valid indicator name
        if not indicator_name:
            logger.warning(f"Could not determine indicator name from {indicator_config}")
            return False
            
        if indicator_name not in indicator_functions:
            logger.warning(f"Unknown indicator '{indicator_name}' for {ticker}. Skipping.")
            return False
            
        # Log the parameters we're using
        logger.debug(f"Adding indicator '{indicator_name}' for {ticker} with parameters: {params}")
            
        # Call the indicator function with the parameters
        result = indicator_functions[indicator_name](data, ticker, **params)
        
        # Handle multiple-trace results for indicators that return tuples
        if isinstance(result, tuple):
            for trace in result:
                if trace is not None:
                    # Add trace to the specified panel
                    if panel_idx > 1:
                        fig.add_trace(trace, row=panel_idx, col=1)
                    else:
                        fig.add_trace(trace)
            return True
        else:
            if result:
                # Add trace to the specified panel
                if panel_idx > 1:
                    fig.add_trace(result, row=panel_idx, col=1)
                else:
                    fig.add_trace(result)
                return True
                
        return False
    except Exception as e:
        logger.exception(f"Error adding indicator to chart for {ticker}: {str(e)}")
        return False

