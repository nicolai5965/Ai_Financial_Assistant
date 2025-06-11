import os
from typing import Optional, Literal, List
from datetime import datetime # timedelta is not used directly in this file but good to keep if models change
import logging
import sys

# Importing models from the .models module within the same package
from .models import TradeLogLLMExtract, CalculatedTradeData

# Logger setup
try:
    from ..core.logging_config import get_logger
    logger = get_logger()
except ImportError:
    print("Warning: Could not import get_logger from app.core.logging_config. Using basic Python logging for calculations.py.")
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.DEBUG)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        try:
            if hasattr(sys.stderr, 'reconfigure'):
                sys.stderr.reconfigure(encoding='utf-8')
        except Exception as e:
            print(f"Notice: Could not set UTF-8 encoding on fallback logger stream handler in calculations.py: {e}. Using platform default.")
            pass
        logger.addHandler(handler)
    logger.info("Fallback logger initialized for calculations.py.")

def format_duration(seconds: float) -> str:
    """
    Converts a duration in seconds to a human-readable string format (e.g., "1d 2h 30m 15s").

    Args:
        seconds: The duration in seconds.

    Returns:
        A string representing the duration in a human-readable format.
        Returns "N/A (invalid duration)" if seconds is negative.
        Returns "0s" if seconds is zero.
    """
    if seconds < 0: 
        return "N/A (invalid duration)"
    if seconds == 0:
        return "0s"
    
    days, remainder = divmod(seconds, 86400)  # 24*60*60
    hours, remainder = divmod(remainder, 3600) # 60*60
    minutes, secs = divmod(remainder, 60)
    
    parts = []
    if days > 0: parts.append(f"{int(days)}d")
    if hours > 0: parts.append(f"{int(hours)}h")
    if minutes > 0: parts.append(f"{int(minutes)}m")
    # Show seconds if it's the only unit, or if it's non-zero, or if there are no other parts (i.e. duration < 1 min)
    if secs > 0 or not parts:
        parts.append(f"{int(secs)}s" if secs % 1 == 0 else f"{secs:.2f}s") 
        
    return " ".join(parts)

def calculate_additional_trade_data(extracted_data: TradeLogLLMExtract) -> CalculatedTradeData:
    """
    Calculates additional financial metrics based on LLM-extracted trade data.

    This includes:
    - Final PNL in USD (net of commissions).
    - Trade status (WIN, LOSS, BREAK_EVEN).
    - Initial risk per unit and total initial risk in USD.
    - Expected PNL and R-multiple at the initial take-profit target.
    - Actual R-multiple achieved.
    - Trade duration in seconds and human-readable format.

    Args:
        extracted_data: A TradeLogLLMExtract object containing data parsed by the LLM.

    Returns:
        A CalculatedTradeData object populated with the calculated metrics.
    """
    # --- PNL Override for Scaled-In Trades ---
    # Check if the LLM extracted a gross P&L directly from a 'Close position' log line.
    # This is more reliable for scaled-in trades than calculating from a single entry/exit price.
    if extracted_data.gross_pnl_from_close_event is not None:
        logger.info(
            f"Using PNL override for scaled-in trade on symbol '{extracted_data.symbol}'. "
            f"Gross P&L from log: {extracted_data.gross_pnl_from_close_event}"
        )
        # The final PNL is the gross PNL from the close event plus all summed commissions.
        final_pnl_usd = extracted_data.gross_pnl_from_close_event
        if extracted_data.total_commission_fees_usd is not None:
            final_pnl_usd += extracted_data.total_commission_fees_usd
        
        final_pnl_usd = round(final_pnl_usd, 2)

        # Since this is a scaled-in trade, some metrics based on a single entry price are ambiguous.
        # We set a clear status and calculate what we can.
        if final_pnl_usd > 0: status = "WIN"
        elif final_pnl_usd < 0: status = "LOSS"
        else: status = "BREAK_EVEN"
        
        # We can still attempt to calculate risk and duration, but they might be less meaningful.
        # The existing logic below will handle this based on the available data.
        # Fall through to the rest of the function to calculate what's possible (like duration).
        # We will re-assign final_pnl_usd and status at the end.

    else:
        # If no override PNL is present, set final_pnl_usd to None so the original logic path is followed.
        final_pnl_usd = None
        status = None

    # Initialize all other calculable fields to None or their defaults
    initial_risk_per_unit_usd: Optional[float] = None
    initial_total_risk_usd: Optional[float] = None
    expected_pnl_at_initial_tp_usd: Optional[float] = None
    expected_r_multiple_at_initial_tp: Optional[float] = None
    actual_r_multiple_on_risk: Optional[float] = None
    trade_duration_seconds: Optional[float] = None
    trade_duration_readable: Optional[str] = None

    # Determine the conversion rate for quote currency to USD.
    # Default to 1.0 if quote is USD or if the rate is not provided (USD metrics will be None in the latter case).
    rate = 1.0
    can_convert_to_usd = False
    if extracted_data.quote_currency and extracted_data.quote_currency.upper() == "USD":
        can_convert_to_usd = True # Rate is effectively 1.0 for USD quotes
    elif extracted_data.conversion_rate_of_quote_to_usd is not None:
        rate = extracted_data.conversion_rate_of_quote_to_usd
        can_convert_to_usd = True
    else:
        # Log a warning if conversion to USD is not possible due to missing rate for non-USD currency.
        logger.warning(
            f"Cannot convert to USD for symbol '{extracted_data.symbol}'. "
            f"Quote currency is '{extracted_data.quote_currency}' but conversion_rate_of_quote_to_usd is missing. "
            f"USD-based monetary metrics will be None."
        )

    # Calculate Initial Risk in USD if possible (requires prices and conversion ability)
    if can_convert_to_usd and extracted_data.initial_stop_loss_price is not None and extracted_data.entry_price is not None:
        risk_per_unit_in_quote_currency = abs(extracted_data.entry_price - extracted_data.initial_stop_loss_price)
        initial_risk_per_unit_usd = round(risk_per_unit_in_quote_currency * rate, 5) # Higher precision for per-unit risk
        if extracted_data.initial_units is not None:
            initial_total_risk_usd = round(initial_risk_per_unit_usd * extracted_data.initial_units, 2)

    # Calculate Gross PNL from prices in USD if possible (requires exit data and conversion ability)
    gross_pnl_from_prices_usd: Optional[float] = None
    if can_convert_to_usd and \
       extracted_data.exit_price is not None and \
       extracted_data.exit_units is not None and \
       extracted_data.entry_price is not None: # entry_price is non-optional, but good to be explicit
        current_pnl_in_quote_currency = 0.0
        # Direct calculation for a single exit event
        if extracted_data.direction == "BUY":
            current_pnl_in_quote_currency = (extracted_data.exit_price - extracted_data.entry_price) * extracted_data.exit_units
        elif extracted_data.direction == "SELL":
            current_pnl_in_quote_currency = (extracted_data.entry_price - extracted_data.exit_price) * extracted_data.exit_units
        gross_pnl_from_prices_usd = round(current_pnl_in_quote_currency * rate, 2)
    elif extracted_data.exit_price is not None or extracted_data.exit_units is not None or extracted_data.exit_timestamp is not None:
        # Log if some exit data is present but not all required for PNL calculation from prices,
        # or if conversion to USD is not possible.
        logger.warning(
            f"Incomplete or non-convertible exit data for symbol '{extracted_data.symbol}'. "
            f"Exit Price: {extracted_data.exit_price}, Units: {extracted_data.exit_units}, Timestamp: {extracted_data.exit_timestamp}, Can convert: {can_convert_to_usd}. "
            f"Gross PNL calculation from prices skipped or incomplete."
        )

    # Calculate Net Final PNL USD (after commissions)
    # This relies on gross_pnl_from_prices_usd and total_commission_fees_usd from LLM.
    if gross_pnl_from_prices_usd is not None:
        final_pnl_usd = gross_pnl_from_prices_usd
        if extracted_data.total_commission_fees_usd is not None:
            # Add commissions (expected to be negative if they are costs)
            final_pnl_usd += extracted_data.total_commission_fees_usd
            final_pnl_usd = round(final_pnl_usd, 2)
    elif extracted_data.total_commission_fees_usd is not None and not can_convert_to_usd:
        # This case occurs if commissions are provided (assumed to be in USD by the LLM field definition)
        # but PNL from prices could not be calculated/converted to USD.
        logger.warning(
            f"Commissions (total_commission_fees_usd: {extracted_data.total_commission_fees_usd}) are present for symbol '{extracted_data.symbol}', "
            f"but PNL from prices could not be calculated/converted to USD. "
            f"final_pnl_usd will reflect commissions only."
        )
        final_pnl_usd = extracted_data.total_commission_fees_usd # This assumes total_commission_fees_usd is already in USD as per its definition.
    elif extracted_data.total_commission_fees_usd is not None and can_convert_to_usd and gross_pnl_from_prices_usd is None:
        #This case occurs if commissions are provided (assumed to be in USD) and currency CAN be converted, but gross PNL from prices is missing (e.g. no exits)
        logger.warning(
             f"Commissions (total_commission_fees_usd: {extracted_data.total_commission_fees_usd}) are present for symbol '{extracted_data.symbol}', "
             f"but PNL from prices could not be calculated (e.g. no exit data). "
             f"final_pnl_usd will reflect commissions only."
        )
        final_pnl_usd = extracted_data.total_commission_fees_usd


    # --- Final PNL and Status Assignment ---
    # This block ensures that if the PNL override was used, its values are preserved.
    # Otherwise, it uses the values from the standard calculation path.
    
    final_pnl_to_use = final_pnl_usd
    status_to_use = status

    if extracted_data.gross_pnl_from_close_event is not None:
        # Recalculate and reassign from the override values to ensure they are final.
        override_pnl = extracted_data.gross_pnl_from_close_event
        if extracted_data.total_commission_fees_usd is not None:
            override_pnl += extracted_data.total_commission_fees_usd
        final_pnl_to_use = round(override_pnl, 2)

        if final_pnl_to_use > 0: status_to_use = "WIN"
        elif final_pnl_to_use < 0: status_to_use = "LOSS"
        else: status_to_use = "BREAK_EVEN"
    
    else:
        # Determine Trade Status based on Net PNL USD calculated the standard way
        if final_pnl_to_use is not None:
            if final_pnl_to_use > 40: status_to_use = "WIN"
            elif final_pnl_to_use < -40: status_to_use = "LOSS"
            else: status_to_use = "BREAK_EVEN"

    # Calculate Expected PNL at Initial Take Profit in USD if possible
    if can_convert_to_usd and extracted_data.initial_take_profit_price is not None and \
       extracted_data.entry_price is not None and extracted_data.initial_units is not None:
        expected_pnl_at_tp_in_quote_currency = 0.0
        if extracted_data.direction == "BUY":
            expected_pnl_at_tp_in_quote_currency = (extracted_data.initial_take_profit_price - extracted_data.entry_price) * extracted_data.initial_units
        elif extracted_data.direction == "SELL":
            expected_pnl_at_tp_in_quote_currency = (extracted_data.entry_price - extracted_data.initial_take_profit_price) * extracted_data.initial_units
        expected_pnl_at_initial_tp_usd = round(expected_pnl_at_tp_in_quote_currency * rate, 2)

    # Calculate R-Multiples if all necessary USD values are available and risk is not zero.
    if final_pnl_to_use is not None and initial_total_risk_usd is not None and initial_total_risk_usd != 0:
        actual_r_multiple_on_risk = round(final_pnl_to_use / initial_total_risk_usd, 2)
    
    if expected_pnl_at_initial_tp_usd is not None and initial_total_risk_usd is not None and initial_total_risk_usd != 0:
        expected_r_multiple_at_initial_tp = round(expected_pnl_at_initial_tp_usd / initial_total_risk_usd, 2)
        
    # Calculate Trade Duration if entry and (single) exit timestamps are available.
    if extracted_data.entry_timestamp and extracted_data.exit_timestamp:
        # Use the single exit timestamp for duration calculation.
        last_exit_time = extracted_data.exit_timestamp # This is now Optional[datetime]
        # No need to check if last_exit_time is None here as the outer if already checks extracted_data.exit_timestamp
        
        duration_delta = last_exit_time - extracted_data.entry_timestamp
        trade_duration_seconds = duration_delta.total_seconds()
        if trade_duration_seconds >= 0: # Ensure duration is not negative (sanity check)
            trade_duration_readable = format_duration(trade_duration_seconds)
        else:
            # Log if a negative duration is calculated, indicating inconsistent timestamp data.
            logger.warning(
                f"Calculated negative trade duration ({trade_duration_seconds}s) for symbol '{extracted_data.symbol}'. "
                f"Entry: {extracted_data.entry_timestamp}, Exit: {last_exit_time}. Setting duration to N/A."
            )
            trade_duration_seconds = None # Mark as None or an indicator of invalidity
            trade_duration_readable = "N/A (invalid)"
        
    return CalculatedTradeData(
        final_pnl_usd=final_pnl_to_use, 
        status=status_to_use,
        initial_risk_per_unit_usd=initial_risk_per_unit_usd,
        initial_total_risk_usd=initial_total_risk_usd,
        expected_pnl_at_initial_tp_usd=expected_pnl_at_initial_tp_usd,
        expected_r_multiple_at_initial_tp=expected_r_multiple_at_initial_tp,
        actual_r_multiple_on_risk=actual_r_multiple_on_risk,
        trade_duration_seconds=trade_duration_seconds,
        trade_duration_readable=trade_duration_readable
    ) 