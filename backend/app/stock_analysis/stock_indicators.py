import plotly.graph_objects as go
import pandas as pd
import numpy as np # Needed for OBV
from ..core.logging_config import get_logger

logger = get_logger()

# REMOVED: determine_window_size function (no longer used for truncation)
# REMOVED: _get_window_size function (no longer used for truncation)


def calculate_SMA(data, ticker, window=None, default_window=20):
    """
    Calculate Simple Moving Average using the full specified window size.

    Parameters:
        data (DataFrame): The stock price data (potentially extended).
        ticker (str): The stock ticker symbol.
        window (int, optional): Custom window size. Uses default if None.
        default_window (int): The default window size if window param is None.

    Returns:
        go.Scatter or None: A Plotly scatter trace for SMA, or None if insufficient data.
    """
    try:
        # Use parameter directly, falling back to default
        effective_window = window if window is not None else default_window
        effective_window = max(1, int(effective_window)) # Ensure positive integer

        # Check if data length is sufficient for *at least one* calculation
        if len(data) < effective_window:
            logger.warning(f"Insufficient data ({len(data)} points) to calculate SMA with window {effective_window} for {ticker}. Returning None.")
            return None # Or return an empty trace: go.Scatter(x=[], y=[], mode='lines', name=f'SMA ({effective_window}) - No Data')

        # Use effective_window directly in the calculation
        sma = data['Close'].rolling(window=effective_window).mean()
        trace = go.Scatter(x=data.index, y=sma, mode='lines', name=f'SMA ({effective_window})')
        logger.debug(f"Calculated SMA ({effective_window}) for {ticker} using full intended window.")
        return trace
    except Exception as e:
        logger.exception(f"Error calculating SMA({window if window else default_window}) for {ticker}: {str(e)}")
        return None

def calculate_EMA(data, ticker, window=None, default_window=20):
    """
    Calculate Exponential Moving Average using the full specified window size.

    Parameters:
        data (DataFrame): The stock price data (potentially extended).
        ticker (str): The stock ticker symbol.
        window (int, optional): Custom span size. Uses default if None.
        default_window (int): The default span size if window param is None.

    Returns:
        go.Scatter or None: A Plotly scatter trace for EMA, or None if insufficient data.
    """
    try:
        # Use parameter directly, falling back to default
        effective_span = window if window is not None else default_window
        effective_span = max(1, int(effective_span)) # Ensure positive integer

        # Check if data length is sufficient. EMA technically needs fewer points than span to start,
        # but visually meaningful results require more. Check against span / 2 as a heuristic.
        min_data_needed = max(1, effective_span // 2) # Heuristic minimum
        if len(data) < min_data_needed:
             logger.warning(f"Insufficient data ({len(data)} points) to calculate EMA with span {effective_span} for {ticker}. Min needed: {min_data_needed}. Returning None.")
             return None

        # Use effective_span directly in the calculation
        ema = data['Close'].ewm(span=effective_span, adjust=False).mean() # adjust=False is common for TA
        trace = go.Scatter(x=data.index, y=ema, mode='lines', name=f'EMA ({effective_span})')
        logger.debug(f"Calculated EMA ({effective_span}) for {ticker} using full intended span.")
        return trace
    except Exception as e:
        logger.exception(f"Error calculating EMA({window if window else default_window}) for {ticker}: {str(e)}")
        return None

def calculate_Bollinger_Bands(data, ticker, window=None, std_dev=None, default_window=20, default_std_dev=2):
    """
    Calculate Bollinger Bands using the full specified window size.

    Parameters:
        data (DataFrame): The stock price data (potentially extended).
        ticker (str): The stock ticker symbol.
        window (int, optional): Custom window size. Uses default if None.
        std_dev (int, optional): Number of standard deviations. Uses default if None.
        default_window (int): Default window size.
        default_std_dev (int): Default standard deviation multiplier.

    Returns:
        tuple or (None, None): (upper_trace, lower_trace) for Bollinger Bands, or (None, None) if insufficient data.
    """
    try:
        # Use parameters directly, falling back to defaults
        effective_window = window if window is not None else default_window
        effective_window = max(1, int(effective_window))
        effective_std_dev = std_dev if std_dev is not None else default_std_dev
        effective_std_dev = float(effective_std_dev) # Allow float std devs

        # Check if data length is sufficient for the rolling calculation
        if len(data) < effective_window:
            logger.warning(f"Insufficient data ({len(data)} points) to calculate Bollinger Bands with window {effective_window} for {ticker}. Returning (None, None).")
            return (None, None)

        sma = data['Close'].rolling(window=effective_window).mean()
        std = data['Close'].rolling(window=effective_window).std()
        bb_upper = sma + effective_std_dev * std
        bb_lower = sma - effective_std_dev * std

        upper_trace = go.Scatter(x=data.index, y=bb_upper, mode='lines', name=f'BB Upper ({effective_window}, {effective_std_dev}σ)', line=dict(width=1, dash='dash'))
        lower_trace = go.Scatter(x=data.index, y=bb_lower, mode='lines', name=f'BB Lower ({effective_window}, {effective_std_dev}σ)', line=dict(width=1, dash='dash'))

        logger.debug(f"Calculated Bollinger Bands ({effective_window}, {effective_std_dev}σ) for {ticker} using full intended window.")
        return (upper_trace, lower_trace)
    except Exception as e:
        logger.exception(f"Error calculating Bollinger Bands({window if window else default_window}, {std_dev if std_dev else default_std_dev}) for {ticker}: {str(e)}")
        return (None, None)

def calculate_VWAP(data, ticker):
    """
    Calculate Volume Weighted Average Price (VWAP). Requires 'Close' and 'Volume'.

    Parameters:
        data (DataFrame): The stock price data. Should contain 'Close' and 'Volume'.
        ticker (str): The stock ticker symbol.

    Returns:
        go.Scatter or None: A Plotly scatter trace for VWAP, or None if required columns missing or error.
    """
    try:
        if 'Close' not in data.columns or 'Volume' not in data.columns:
             logger.error(f"VWAP calculation requires 'Close' and 'Volume' columns, missing in data for {ticker}.")
             return None
        if data['Volume'].sum() == 0: # Avoid division by zero if volume is zero everywhere
             logger.warning(f"Total volume is zero for {ticker} in the provided data. Cannot calculate VWAP.")
             return None

        temp_data = data.copy()
        # Calculate VWAP as cumulative sum of price*volume divided by cumulative volume
        # Add small epsilon to denominator to avoid potential division by zero on the first row if volume is 0
        epsilon = 1e-10
        vwap = (temp_data['Close'] * temp_data['Volume']).cumsum() / (temp_data['Volume'].cumsum() + epsilon)
        trace = go.Scatter(x=data.index, y=vwap, mode='lines', name='VWAP')
        logger.debug("Calculated VWAP for %s.", ticker)
        return trace
    except Exception as e:
        logger.exception("Error calculating VWAP for %s: %s", ticker, str(e))
        return None


def calculate_RSI(data, ticker, window=None, default_window=14):
    """
    Calculate the Relative Strength Index (RSI) using the full specified window size.

    Parameters:
        data (DataFrame): The stock price data (potentially extended).
        ticker (str): The stock ticker symbol.
        window (int, optional): Custom window size. Uses default if None.
        default_window (int): Default window size for RSI calculation.

    Returns:
        go.Scatter or None: A Plotly scatter trace for RSI, or None if insufficient data.
    """
    try:
        # Use parameter directly, falling back to default
        effective_window = window if window is not None else default_window
        effective_window = max(1, int(effective_window))

        # RSI needs at least window + 1 data points to calculate the first value
        min_data_needed = effective_window + 1
        if len(data) < min_data_needed:
            logger.warning(f"Insufficient data ({len(data)} points) to calculate RSI with window {effective_window} for {ticker}. Min needed: {min_data_needed}. Returning None.")
            return None

        delta = data['Close'].diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)

        # Use Exponential Moving Average (EMA) for average gain/loss, common RSI practice
        avg_gain = gain.ewm(com=effective_window - 1, min_periods=effective_window).mean()
        avg_loss = loss.ewm(com=effective_window - 1, min_periods=effective_window).mean()

        # Calculate RSI
        rs = avg_gain / (avg_loss + 1e-10) # Add epsilon to avoid division by zero
        rsi = 100 - (100 / (1 + rs))

        trace = go.Scatter(x=data.index, y=rsi, mode='lines', name=f'RSI ({effective_window})')
        logger.debug("Calculated RSI (%d) for %s using full intended window.", effective_window, ticker)
        return trace
    except Exception as e:
        logger.exception(f"Error calculating RSI({window if window else default_window}) for {ticker}: {str(e)}")
        return None

def calculate_MACD(data, ticker, fast_window=None, slow_window=None, signal_window=None,
                  default_fast_window=12, default_slow_window=26, default_signal_window=9):
    """
    Calculate the MACD and its signal line using the full specified window sizes.

    Parameters:
        data (DataFrame): The stock price data (potentially extended).
        ticker (str): The stock ticker symbol.
        fast_window (int, optional): Custom span for the fast EMA.
        slow_window (int, optional): Custom span for the slow EMA.
        signal_window (int, optional): Custom span for the signal line EMA.
        default_fast_window (int): Default span for the fast EMA.
        default_slow_window (int): Default span for the slow EMA.
        default_signal_window (int): Default span for the signal line.

    Returns:
        tuple or (None, None): (macd_trace, signal_trace), or (None, None) if insufficient data.
    """
    try:
        # Use parameters directly, falling back to defaults
        fast = fast_window if fast_window is not None else default_fast_window
        slow = slow_window if slow_window is not None else default_slow_window
        signal = signal_window if signal_window is not None else default_signal_window
        fast = max(1, int(fast))
        slow = max(1, int(slow))
        signal = max(1, int(signal))

        if fast >= slow:
            logger.error(f"MACD fast window ({fast}) must be less than slow window ({slow}) for {ticker}. Returning (None, None).")
            return (None, None)

        # Check for sufficient data length based on the *slowest* window needed for the main MACD line.
        # EMA needs fewer points than span, use slow/2 heuristic. Signal line needs MACD values first.
        min_data_needed = max(1, slow // 2) # Heuristic minimum for slow EMA
        if len(data) < min_data_needed:
             logger.warning(f"Insufficient data ({len(data)} points) for MACD ({fast},{slow},{signal}) for {ticker}. Min needed for slow EMA: ~{min_data_needed}. Returning (None, None).")
             return (None, None)

        # Proceed with calculations using fast, slow, signal spans
        fast_ema = data['Close'].ewm(span=fast, adjust=False).mean()
        slow_ema = data['Close'].ewm(span=slow, adjust=False).mean()
        macd = fast_ema - slow_ema
        signal_line = macd.ewm(span=signal, adjust=False).mean()

        # Create plotly traces for MACD and signal line
        macd_trace = go.Scatter(x=data.index, y=macd, mode='lines', name=f'MACD ({fast},{slow})')
        signal_trace = go.Scatter(x=data.index, y=signal_line, mode='lines', name=f'Signal ({signal})')

        logger.debug(f"Calculated MACD for {ticker} with spans: fast={fast}, slow={slow}, signal={signal} using full intended spans.")
        return (macd_trace, signal_trace)
    except Exception as e:
        logger.exception(f"Error calculating MACD({fast_window or default_fast_window},{slow_window or default_slow_window},{signal_window or default_signal_window}) for {ticker}: {str(e)}")
        return (None, None)

def calculate_ATR(data, ticker, window=None, default_window=14):
    """
    Calculate the Average True Range (ATR) using the full specified window size.

    Parameters:
        data (DataFrame): Stock data with 'High', 'Low', 'Close' columns.
        ticker (str): Stock ticker symbol.
        window (int, optional): Custom window size. Uses default if None.
        default_window (int): Default window size for ATR calculation.

    Returns:
        go.Scatter or None: Plotly trace for ATR, or None if insufficient data or missing columns.
    """
    try:
        if not all(col in data.columns for col in ['High', 'Low', 'Close']):
            logger.error(f"ATR calculation requires 'High', 'Low', 'Close' columns, missing in data for {ticker}.")
            return None

        effective_window = window if window is not None else default_window
        effective_window = max(1, int(effective_window))

        # ATR needs window + 1 data points for the first calculation (due to shift and rolling).
        min_data_needed = effective_window + 1
        if len(data) < min_data_needed:
            logger.warning(f"Insufficient data ({len(data)} points) to calculate ATR with window {effective_window} for {ticker}. Min needed: {min_data_needed}. Returning None.")
            return None

        high_low = data['High'] - data['Low']
        high_close = (data['High'] - data['Close'].shift()).abs()
        low_close = (data['Low'] - data['Close'].shift()).abs()

        # True Range is the maximum of the three components, fill NaN for the first row
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1, skipna=False)
        # Use Wilder's smoothing (equivalent to EMA with alpha = 1/N) for ATR, common practice
        atr = true_range.ewm(alpha=1/effective_window, adjust=False, min_periods=effective_window).mean()

        trace = go.Scatter(x=data.index, y=atr, mode='lines', name=f'ATR ({effective_window})')
        logger.debug(f"Calculated ATR ({effective_window}) for {ticker} using full intended window.")
        return trace
    except Exception as e:
        logger.exception(f"Error calculating ATR({window if window else default_window}) for {ticker}: {str(e)}")
        return None

def calculate_OBV(data, ticker):
    """
    Calculate the On-Balance Volume (OBV). Requires 'Close' and 'Volume'.

    Parameters:
        data (DataFrame): Stock data with 'Close' and 'Volume' columns.
        ticker (str): Stock ticker symbol.

    Returns:
        go.Scatter or None: Plotly trace for OBV, or None if missing columns or error.
    """
    try:
        if 'Close' not in data.columns or 'Volume' not in data.columns:
             logger.error(f"OBV calculation requires 'Close' and 'Volume' columns, missing in data for {ticker}.")
             return None
        if len(data) < 2:
             logger.warning(f"Insufficient data ({len(data)} points) to calculate OBV for {ticker}. Needs at least 2 points for diff.")
             return None

        delta = data['Close'].diff()
        # Create an array where positive change gets volume, negative gets -volume, zero gets 0.
        # Handle the first NaN in delta by assigning 0 change.
        obv_values = np.where(delta > 0, data['Volume'],
                              np.where(delta < 0, -data['Volume'], 0))
        obv_values = np.nan_to_num(obv_values) # Replace potential NaNs (like first element) with 0

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
    Calculate the Stochastic Oscillator (%K and %D) using full specified window sizes.

    Parameters:
        data (DataFrame): Stock data with 'High', 'Low', 'Close' columns.
        ticker (str): Stock ticker symbol.
        k_window (int, optional): Window size for %K. Uses default if None.
        d_window (int, optional): Window size for %D (SMA of %K). Uses default if None.
        default_k_window (int): Default window size for %K.
        default_d_window (int): Default window size for %D.

    Returns:
        tuple or (None, None): (k_trace, d_trace), or (None, None) if insufficient data or missing columns.
    """
    try:
        if not all(col in data.columns for col in ['High', 'Low', 'Close']):
            logger.error(f"Stochastic Oscillator requires 'High', 'Low', 'Close' columns, missing in data for {ticker}.")
            return (None, None)

        # Use parameters directly, falling back to defaults
        k_size = k_window if k_window is not None else default_k_window
        d_size = d_window if d_window is not None else default_d_window
        k_size = max(1, int(k_size))
        d_size = max(1, int(d_size))

        # %K calculation needs k_size points. %D calculation needs d_size points *of %K*.
        # Total minimum points needed is roughly k_size + d_size - 1
        min_data_needed = k_size + d_size - 1
        if len(data) < min_data_needed:
             logger.warning(f"Insufficient data ({len(data)} points) for Stochastic ({k_size},{d_size}) for {ticker}. Min needed: {min_data_needed}. Returning (None, None).")
             return (None, None)

        low_min = data['Low'].rolling(window=k_size).min()
        high_max = data['High'].rolling(window=k_size).max()
        # Add epsilon to denominator to prevent division by zero if high_max == low_min
        k_percent = 100 * ((data['Close'] - low_min) / (high_max - low_min + 1e-10))

        # Calculate %D (simple moving average of %K)
        d_percent = k_percent.rolling(window=d_size).mean()

        # Create plotly traces
        k_trace = go.Scatter(x=data.index, y=k_percent, mode='lines', name=f'Stoch %K ({k_size})')
        d_trace = go.Scatter(x=data.index, y=d_percent, mode='lines', name=f'Stoch %D ({d_size})')

        logger.debug(f"Calculated Stochastic Oscillator for {ticker} with %K={k_size}, %D={d_size} using full intended windows.")
        return (k_trace, d_trace)
    except Exception as e:
        logger.exception(f"Error calculating Stochastic Oscillator({k_window or default_k_window},{d_window or default_d_window}) for {ticker}: {str(e)}")
        return (None, None)

def calculate_ichimoku_cloud(data, ticker, conversion_period=None, base_period=None, lagging_span_b_period=None,
                            default_conversion_period=9, default_base_period=26, default_lagging_span_b_period=52):
    """
    Calculate Ichimoku Cloud components using full specified periods.

    Parameters:
        data (DataFrame): Stock data with 'High', 'Low', 'Close' columns.
        ticker (str): Stock ticker symbol.
        conversion_period (int, optional): Period for Conversion Line (Tenkan-sen).
        base_period (int, optional): Period for Base Line (Kijun-sen).
        lagging_span_b_period (int, optional): Period for Leading Span B.
        default_conversion_period (int): Default period for Conversion Line.
        default_base_period (int): Default period for Base Line.
        default_lagging_span_b_period (int): Default period for Leading Span B.

    Returns:
        tuple or (None, None, None, None): Traces for (Conversion, Base, Leading A, Leading B),
                                             or Nones if insufficient data or missing columns.
    """
    try:
        if not all(col in data.columns for col in ['High', 'Low']): # Close isn't directly needed but High/Low are essential
            logger.error(f"Ichimoku Cloud requires 'High' and 'Low' columns, missing in data for {ticker}.")
            return (None, None, None, None)

        # Use parameters directly, falling back to defaults
        conv_p = conversion_period if conversion_period is not None else default_conversion_period
        base_p = base_period if base_period is not None else default_base_period
        lagging_p = lagging_span_b_period if lagging_span_b_period is not None else default_lagging_span_b_period
        conv_p = max(1, int(conv_p))
        base_p = max(1, int(base_p))
        lagging_p = max(1, int(lagging_p))

        # Determine minimum data needed. Depends on the largest window used (lagging_p)
        # and the shift applied (base_p). Need at least lagging_p points for span B calc.
        min_data_needed = max(conv_p, base_p, lagging_p)
        if len(data) < min_data_needed:
             logger.warning(f"Insufficient data ({len(data)} points) for Ichimoku ({conv_p},{base_p},{lagging_p}) for {ticker}. Min needed: {min_data_needed}. Returning (None, None, None, None).")
             return (None, None, None, None)

        # Conversion Line (Tenkan-sen)
        conv_high = data['High'].rolling(window=conv_p).max()
        conv_low = data['Low'].rolling(window=conv_p).min()
        conversion_line = (conv_high + conv_low) / 2

        # Base Line (Kijun-sen)
        base_high = data['High'].rolling(window=base_p).max()
        base_low = data['Low'].rolling(window=base_p).min()
        base_line = (base_high + base_low) / 2

        # Leading Span A (Senkou Span A) - shifted forward by base_period
        leading_span_a = ((conversion_line + base_line) / 2).shift(base_p)

        # Leading Span B (Senkou Span B) - shifted forward by base_period
        lagging_high = data['High'].rolling(window=lagging_p).max()
        lagging_low = data['Low'].rolling(window=lagging_p).min()
        leading_span_b = ((lagging_high + lagging_low) / 2).shift(base_p)

        # Create plotly traces
        # Note: Plotly handles the shifted index correctly when plotting against the original index
        conversion_trace = go.Scatter(x=data.index, y=conversion_line, mode='lines',
                                     name=f'Conversion ({conv_p})', line=dict(color='blue', width=1))
        base_trace = go.Scatter(x=data.index, y=base_line, mode='lines',
                               name=f'Base ({base_p})', line=dict(color='red', width=1))
        leading_a_trace = go.Scatter(x=data.index, y=leading_span_a, mode='lines',
                                    name=f'Leading A (Shift {base_p})', line=dict(color='rgba(0,128,0,0.5)', width=1), ) # Greenish
        leading_b_trace = go.Scatter(x=data.index, y=leading_span_b, mode='lines',
                                    name=f'Leading B (Shift {base_p})', line=dict(color='rgba(255,0,0,0.5)', width=1), # Reddish
                                    fill='tonexty', # Fill the cloud area between span A and B
                                    fillcolor='rgba(144,238,144,0.2)') # Light green fill


        logger.debug(f"Calculated Ichimoku Cloud for {ticker} with params: conv={conv_p}, base={base_p}, lagging={lagging_p} using full intended periods.")
        # Return only the main lines, cloud fill is handled by leading_b_trace config
        return (conversion_trace, base_trace, leading_a_trace, leading_b_trace)
    except Exception as e:
        logger.exception(f"Error calculating Ichimoku Cloud({conversion_period or default_conversion_period},{base_period or default_base_period},{lagging_span_b_period or default_lagging_span_b_period}) for {ticker}: {str(e)}")
        return (None, None, None, None)


# Helper function to extract indicator parameters (remains useful)
def _extract_indicator_params(indicator_config):
    """
    Extract indicator name and parameters from different configuration formats.

    Parameters:
        indicator_config (str/dict/object): Indicator configuration

    Returns:
        tuple: (indicator_name_upper, params_dict) - Name is uppercased for consistent matching.
    """
    indicator_name = None
    params = {}

    if isinstance(indicator_config, str):
        indicator_name = indicator_config
    elif isinstance(indicator_config, dict):
        indicator_name = indicator_config.get("name")
        params = {k: v for k, v in indicator_config.items() if k not in ["name", "panel"] and v is not None}
    elif hasattr(indicator_config, "name"): # Handles Pydantic models or other objects with name attribute
        indicator_name = indicator_config.name
        # Try to get parameters if it's dict-like or has attributes
        if hasattr(indicator_config, 'model_dump') and callable(getattr(indicator_config, 'model_dump')): # Pydantic v2
             config_dict = indicator_config.model_dump(exclude_none=True)
             params = {k: v for k, v in config_dict.items() if k not in ["name", "panel"]}
        elif hasattr(indicator_config, 'dict') and callable(getattr(indicator_config, 'dict')): # Pydantic v1 / dict-like
            try:
                config_dict = indicator_config.dict(exclude_none=True)
                params = {k: v for k, v in config_dict.items() if k not in ["name", "panel"]}
            except Exception as dict_error:
                 logger.warning(f"Could not convert indicator object to dict using .dict(): {dict_error}. Trying attribute access.")
                 # Fallback to attribute access if dict method fails or doesn't exist
                 for attr_name in dir(indicator_config):
                    if not attr_name.startswith('_') and attr_name not in ["name", "panel", "model_config", "model_fields"] and not callable(getattr(indicator_config, attr_name)):
                        attr_value = getattr(indicator_config, attr_name)
                        if attr_value is not None:
                            params[attr_name] = attr_value
        else: # Fallback: direct attribute access for generic objects
            for attr_name in dir(indicator_config):
                if not attr_name.startswith('_') and attr_name not in ["name", "panel", "model_config", "model_fields"] and not callable(getattr(indicator_config, attr_name)):
                    attr_value = getattr(indicator_config, attr_name)
                    if attr_value is not None:
                        params[attr_name] = attr_value

    # Uppercase name for case-insensitive matching, handle None case
    indicator_name_upper = indicator_name.upper() if indicator_name else None
    # logger.debug(f"Extracted params for {indicator_name_upper}: {params}") # Can be verbose
    return indicator_name_upper, params

# Helper function to add a trace to the chart (remains useful)
def _add_trace_to_panel(fig, trace, panel_idx):
    """
    Add a trace to the specified panel in the figure.

    Parameters:
        fig (go.Figure): The Plotly figure
        trace: The trace to add
        panel_idx (int): The panel index (1-indexed)
    """
    if trace is not None:
        # Plotly uses 1-based indexing for rows
        row_num = panel_idx if panel_idx > 0 else 1
        fig.add_trace(trace, row=row_num, col=1)


def add_indicator_to_chart(fig, data, indicator_config, ticker, panel_idx=1):
    """
    Add a technical indicator to the provided Plotly figure using its full calculation window.

    Parameters:
        fig (go.Figure): The Plotly figure to add the indicator to.
        data (DataFrame): The stock price data (potentially extended).
        indicator_config (str or dict or IndicatorConfig): Indicator name or configuration.
        ticker (str): The stock ticker symbol.
        panel_idx (int): Index of the panel to add the indicator to (1-indexed). Default is 1.

    Returns:
        bool: True if the indicator was added successfully (at least one trace), False otherwise.
    """
    try:
        # Map indicator names (UPPERCASE) to their respective functions
        # Using uppercase keys for case-insensitive matching from _extract_indicator_params
        indicator_functions = {
            "SMA": calculate_SMA,
            "EMA": calculate_EMA,
            "BOLLINGER BANDS": calculate_Bollinger_Bands,
            "VWAP": calculate_VWAP,
            "RSI": calculate_RSI,
            "MACD": calculate_MACD,
            "ATR": calculate_ATR,
            "OBV": calculate_OBV,
            "STOCHASTIC OSCILLATOR": calculate_stochastic_oscillator,
            "ICHIMOKU CLOUD": calculate_ichimoku_cloud
        }

        indicator_name_upper, params = _extract_indicator_params(indicator_config)

        if not indicator_name_upper:
            logger.warning(f"Could not determine indicator name from config: {indicator_config} for {ticker}. Skipping.")
            return False

        if indicator_name_upper not in indicator_functions:
            logger.warning(f"Unknown indicator '{indicator_name_upper}' for {ticker}. Skipping.")
            return False

        logger.debug(f"Adding indicator '{indicator_name_upper}' for {ticker} to panel {panel_idx} with params: {params}")

        # Call the indicator function with the extended data and specific parameters
        result = indicator_functions[indicator_name_upper](data, ticker, **params)

        # Handle results: None, single trace, or tuple of traces
        if result is None:
            logger.warning(f"Calculation for indicator '{indicator_name_upper}' returned None for {ticker}. Not added.")
            return False
        elif isinstance(result, tuple):
            # Add all non-None traces from the tuple to the specified panel
            traces_added = []
            for trace in result:
                if trace is not None:
                    _add_trace_to_panel(fig, trace, panel_idx)
                    traces_added.append(True)
                else:
                    traces_added.append(False)
            return any(traces_added) # Return True if at least one trace was successfully added
        else:
            # Single trace result
            _add_trace_to_panel(fig, result, panel_idx)
            return True # Assume success if a single trace object was returned

    except Exception as e:
        # Catch errors during the indicator function call or trace addition
        indicator_name = indicator_config.get("name", str(indicator_config)) if isinstance(indicator_config, dict) else str(indicator_config)
        logger.exception(f"Error adding indicator '{indicator_name}' to chart for {ticker}: {str(e)}")
        return False