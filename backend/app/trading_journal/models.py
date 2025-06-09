import os
from datetime import datetime, timedelta
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, ValidationInfo
import logging
import sys

# Logger setup
try:
    # Attempt to import the get_logger function from the app's core logging configuration.
    # This assumes that the trading_journal module is part of a larger application structure
    # where 'app.core.logging_config' is accessible.
    from ..core.logging_config import get_logger
    logger = get_logger()
except ImportError:
    # Fallback to basic Python logging if the app-specific logger cannot be imported.
    # This might happen if the module is run in isolation or the path isn't correctly configured.
    print("Warning: Could not import get_logger from app.core.logging_config. Using basic Python logging for models.py.")
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.DEBUG) # Default to DEBUG level for the fallback.
    if not logger.handlers:
        # Add a stream handler if no handlers are configured, to ensure logs are visible.
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        
        # Attempt to set UTF-8 encoding for the error stream, crucial for handling diverse character sets.
        # This configuration is particularly important on platforms where the default encoding might not be UTF-8.
        try:
            # The os.devnull part was likely for suppressing output in test_file's fallback,
            # here we want to see the logs if it's a fallback.
            # handler.setStream(open(os.devnull, 'w', encoding='utf-8')) # This would suppress output
            if hasattr(sys.stderr, 'reconfigure'):
                sys.stderr.reconfigure(encoding='utf-8')
            elif hasattr(sys.stderr, 'buffer'): # Python 3.7+ approach for raw stream
                # This is a more robust way to ensure UTF-8 if reconfigure is not available
                sys.stderr.buffer.write(b'') # Flush before changing encoding if necessary
                # Note: Directly changing sys.stderr encoding is complex and handler.setStream is safer.
                # For simplicity, if reconfigure is not available, we rely on handler's default stream (stderr)
                # and hope the environment's default encoding is sufficient or Python's default handling works.
                pass # Keep it simple if reconfigure is not available
        except Exception as e:
            print(f"Notice: Could not set UTF-8 encoding on fallback logger stream handler in models.py: {e}. Using platform default.")
            pass
        logger.addHandler(handler)
    logger.info("Fallback logger initialized for models.py.")

class TradeLogLLMExtract(BaseModel):
    """
    Pydantic model for data extracted directly from raw trade text by the LLM.
    Contains all the fields the LLM is expected to identify and parse.
    """
    symbol: str = Field(..., description="The trading symbol, e.g., 'COINBASE:SOLUSD'")
    direction: Literal["BUY", "SELL"] = Field(..., description="The direction of the initial trade (BUY or SELL)")
    entry_timestamp: datetime = Field(..., description="Timestamp of the initial trade entry/execution")
    entry_price: float = Field(..., description="Price (in quote_currency) at which the initial trade was entered.")
    initial_units: float = Field(..., description="The total number of units for the initial position.")
    initial_stop_loss_price: Optional[float] = Field(None, description="The first stop-loss price (in quote_currency) set for this trade.")
    initial_take_profit_price: Optional[float] = Field(None, description="The first take-profit price (in quote_currency) set for this trade.")
    exit_timestamp: Optional[datetime] = Field(None, description="Timestamp for the trade exit, if any.")
    exit_price: Optional[float] = Field(None, description="Price (in quote_currency) at which the trade was exited, if any.")
    exit_units: Optional[float] = Field(None, description="Units exited, if any.")
    trade_events_narrative: str = Field(..., description="An LLM-generated summary of trade events.")
    all_order_ids_mentioned: Optional[str] = Field(None, description="All unique order IDs mentioned by the LLM as a single string; should be actual IDs, not other numbers.")

    # Fields for currency and trade type identification by LLM
    trade_type: Optional[Literal["STOCK", "FOREX", "CRYPTO", "FUTURES", "UNKNOWN"]] = Field(None, description="Type of the traded instrument (e.g., STOCK, FOREX). LLM should determine this.")
    quote_currency: Optional[str] = Field(None, description="The currency in which the price is quoted (e.g., USD, DKK, EUR). LLM should identify this from the text.")
    conversion_rate_of_quote_to_usd: Optional[float] = Field(None, description="Conversion rate: 1 unit of quote_currency equals X USD. E.g., if DKK is quote and 1 DKK = 0.15 USD, this is 0.15. If quote is USD, LLM must set to 1.0. LLM should find this or state null if unknown for non-USD quotes.")

    # Fields for leverage and commissions identified by LLM
    leverage: Optional[str] = Field(None, description="Leverage used for the trade, if mentioned by the LLM (e.g., '50x', '100:1').")
    total_commission_fees_usd: Optional[float] = Field(None, description="Total sum of all commission fees for the trade, in USD. LLM should sum these, maintaining signs (e.g., if logs show -1 USD and -1 USD, this should be -2.0 USD). If commissions are in another currency in the log, LLM should convert them to USD using a provided rate or mark as needing conversion if rate is unknown.")

class CalculatedTradeData(BaseModel):
    """
    Pydantic model for data calculated based on the LLM-extracted information.
    Includes PNL, risk metrics, R-multiples, and trade duration.
    All monetary values here are intended to be in USD after conversion.
    """
    final_pnl_usd: Optional[float] = Field(None, description="Net Profit and Loss for the trade (after commissions), in USD.")
    status: Optional[Literal["WIN", "LOSS", "BREAK_EVEN"]] = Field(None, description="Status of the trade based on PNL.")
    
    initial_risk_per_unit_usd: Optional[float] = Field(None, description="Initial risk per unit, in USD, based on entry and initial stop loss.")
    initial_total_risk_usd: Optional[float] = Field(None, description="Total initial risk for the trade, in USD (initial_risk_per_unit_usd * initial_units).")
    
    expected_pnl_at_initial_tp_usd: Optional[float] = Field(None, description="Expected PNL in USD if the initial take-profit price was hit.")
    expected_r_multiple_at_initial_tp: Optional[float] = Field(None, description="Expected R-multiple if initial TP was hit (expected_pnl_at_initial_tp_usd / initial_total_risk_usd).")
    actual_r_multiple_on_risk: Optional[float] = Field(None, description="Actual R-multiple achieved on the initial risk (final_pnl_usd / initial_total_risk_usd).")

    # Fields for trade duration, calculated from entry to last exit.
    trade_duration_seconds: Optional[float] = Field(None, description="Total duration of the trade in seconds.")
    trade_duration_readable: Optional[str] = Field(None, description="Total duration of the trade in human-readable format (e.g., '1d 2h 30m 15s').")

class CombinedTradeLog(BaseModel):
    """
    A comprehensive Pydantic model that combines LLM-extracted data and calculated financial metrics.
    Fields are ordered according to Suggestion 1 for better readability in contexts like database display.
    """
    # Suggestion 1 Order
    id: Optional[int] = Field(None, description="The unique identifier for the trade in the database.")
    symbol: str = Field(..., description="The trading symbol, e.g., 'COINBASE:SOLUSD'")
    status: Optional[Literal["WIN", "LOSS", "BREAK_EVEN"]] = Field(None, description="Status of the trade based on PNL.")
    final_pnl_usd: Optional[float] = Field(None, description="Net Profit and Loss for the trade (after commissions), in USD.")
    actual_r_multiple_on_risk: Optional[float] = Field(None, description="Actual R-multiple achieved on the initial risk (final_pnl_usd / initial_total_risk_usd).")
    direction: Literal["BUY", "SELL"] = Field(..., description="The direction of the initial trade (BUY or SELL)")
    entry_timestamp: datetime = Field(..., description="Timestamp of the initial trade entry/execution")
    entry_price: float = Field(..., description="Price (in quote_currency) at which the initial trade was entered.")
    initial_units: float = Field(..., description="The total number of units for the initial position.")
    exit_timestamp: Optional[datetime] = Field(None, description="Timestamp for the trade exit, if any.")
    exit_price: Optional[float] = Field(None, description="Price (in quote_currency) at which the trade was exited, if any.")
    exit_units: Optional[float] = Field(None, description="Units exited, if any.")
    initial_total_risk_usd: Optional[float] = Field(None, description="Total initial risk for the trade, in USD (initial_risk_per_unit_usd * initial_units).")
    expected_pnl_at_initial_tp_usd: Optional[float] = Field(None, description="Expected PNL in USD if the initial take-profit price was hit.")
    expected_r_multiple_at_initial_tp: Optional[float] = Field(None, description="Expected R-multiple if initial TP was hit (expected_pnl_at_initial_tp_usd / initial_total_risk_usd).")
    total_commission_fees_usd: Optional[float] = Field(None, description="Total sum of all commission fees for the trade, in USD.") # From TradeLogLLMExtract
    trade_type: Optional[Literal["STOCK", "FOREX", "CRYPTO", "FUTURES", "UNKNOWN"]] = Field(None, description="Type of the traded instrument.") # From TradeLogLLMExtract
    quote_currency: Optional[str] = Field(None, description="The currency in which the price is quoted.") # From TradeLogLLMExtract
    conversion_rate_of_quote_to_usd: Optional[float] = Field(None, description="Conversion rate: 1 unit of quote_currency equals X USD.") # From TradeLogLLMExtract
    leverage: Optional[str] = Field(None, description="Leverage used for the trade.") # From TradeLogLLMExtract
    initial_stop_loss_price: Optional[float] = Field(None, description="The first stop-loss price.") # From TradeLogLLMExtract
    initial_take_profit_price: Optional[float] = Field(None, description="The first take-profit price.") # From TradeLogLLMExtract
    initial_risk_per_unit_usd: Optional[float] = Field(None, description="Initial risk per unit, in USD.") # From CalculatedTradeData
    trade_duration_seconds: Optional[float] = Field(None, description="Total duration of the trade in seconds.") # From CalculatedTradeData
    all_order_ids_mentioned: Optional[str] = Field(None, description="All unique order IDs mentioned by the LLM as a single string.") # From TradeLogLLMExtract
    trade_events_narrative: str = Field(..., description="An LLM-generated summary of trade events.") # From TradeLogLLMExtract
    trade_duration_readable: Optional[str] = Field(None, description="Total duration of the trade in human-readable format.") # From CalculatedTradeData

    # This explicit definition replaces the inheritance: class CombinedTradeLog(TradeLogLLMExtract, CalculatedTradeData):
    # All fields from both parent classes are now listed explicitly in the desired order.
    # Ensure all fields are covered and their types/descriptions match the original intent.
    pass 