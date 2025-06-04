import os
import json
from typing import Optional
import logging
import sys

# Importing from other modules within the trading_journal package
from .models import CombinedTradeLog, TradeLogLLMExtract # Assuming all models are in .models
from .llm_extractor import get_llm_trade_extraction
from .calculations import calculate_additional_trade_data, format_duration # format_duration might not be directly used here but good to note its location

# Logger setup
try:
    # Attempt to import the get_logger function from the app's core logging configuration.
    from ..core.logging_config import get_logger
    logger = get_logger()
except ImportError:
    # Fallback to basic Python logging if the app-specific logger cannot be imported.
    print("Warning: Could not import get_logger from app.core.logging_config. Using basic Python logging for trade_parser.py.")
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.DEBUG)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        try:
            if hasattr(sys.stderr, 'reconfigure'):
                sys.stderr.reconfigure(encoding='utf-8')
        except Exception as e:
            print(f"Notice: Could not set UTF-8 encoding on fallback logger stream handler in trade_parser.py: {e}. Using platform default.")
            pass
        logger.addHandler(handler)
    logger.info("Fallback logger initialized for trade_parser.py.")

def process_trade_log_entry(raw_trade_text: str) -> Optional[CombinedTradeLog]:
    """
    Orchestrates the complete processing of a raw trade log entry.

    This involves:
    1. Extracting initial trade data from the raw text using an LLM (via llm_extractor).
    2. Calculating additional financial metrics based on the extracted data (via calculations).
    3. Combining both sets of data into a single CombinedTradeLog object.
    4. Optionally, printing an ordered summary of the combined log to the console.

    Args:
        raw_trade_text: The raw string containing the trade log information.

    Returns:
        An Optional[CombinedTradeLog] object if the entire process is successful,
        otherwise None if any step (LLM extraction, calculation) fails.
    """
    logger.info(f"Step 1: Attempting to extract trade data using LLM for text starting with: '{raw_trade_text[:100]}...'")
    # Defaulting to Google provider; this could be made configurable if needed.
    extracted_data: Optional[TradeLogLLMExtract] = get_llm_trade_extraction(raw_trade_text, llm_provider_name="google") 

    if not extracted_data:
        logger.error("Failed to extract data from LLM. Aborting trade log processing.")
        return None

    logger.info(f"Step 2: LLM Extraction successful for symbol: {extracted_data.symbol}."
                  f" Extracted trade type: {extracted_data.trade_type}, Quote Ccy: {extracted_data.quote_currency}.")
    logger.debug(f"LLM Extracted data dump: {extracted_data.model_dump_json(indent=2)}")
    
    logger.info(f"Step 3: Calculating additional financial metrics for symbol: {extracted_data.symbol}...")
    calculated_data = calculate_additional_trade_data(extracted_data)
    logger.info(f"Calculations complete for symbol: {extracted_data.symbol}. PNL USD: {calculated_data.final_pnl_usd}, Status: {calculated_data.status}")
    logger.debug(f"Calculated data dump: {calculated_data.model_dump_json(indent=2)}")

    # Combine extracted and calculated data into the final log object.
    # The CombinedTradeLog model inherits from both, so it can take all fields directly.
    combined_log_data_dict = {**extracted_data.model_dump(), **calculated_data.model_dump()}
    combined_log = CombinedTradeLog(**combined_log_data_dict)
    
    logger.info(f"Step 4: Final combined trade log created for symbol: {combined_log.symbol}. Final PNL USD: {combined_log.final_pnl_usd}")
    logger.debug(f"Combined log (raw dump): {combined_log.model_dump_json(indent=2)}")

    # Define the desired order for console output for readability.
    # This helps in quick verification and debugging during development.
    ordered_output_keys = [
        # Core Outcome & Identification
        "symbol", "direction", "status", "final_pnl_usd", "actual_r_multiple_on_risk",
        
        # Risk vs. Reward (Expected vs. Actual)
        "initial_total_risk_usd", 
        "expected_pnl_at_initial_tp_usd", "expected_r_multiple_at_initial_tp",
        
        # Trade Classification & Currency Details
        "trade_type", "quote_currency", "conversion_rate_of_quote_to_usd",
        
        # Entry Details & Leverage
        "entry_timestamp", "entry_price", "initial_units", "leverage", 
        
        # Initial Risk Parameters (Prices in quote_currency, then derived USD value)
        "initial_stop_loss_price", "initial_take_profit_price", 
        "initial_risk_per_unit_usd", # This is already in USD from calculations
        
        # Exit Details (Lists of timestamps, prices, units)
        "exit_timestamp", "exit_price", "exit_units",
        
        # Fees and Duration
        "total_commission_fees_usd", 
        "trade_duration_readable", "trade_duration_seconds", 
        
        # Supporting Information from LLM
        "all_order_ids_mentioned", "trade_events_narrative"
    ]

    # Create an ordered dictionary for printing to ensure consistent output format.
    combined_log_dict_for_print = combined_log.model_dump()
    ordered_log_dict_for_print = {key: combined_log_dict_for_print.get(key) for key in ordered_output_keys if key in combined_log_dict_for_print}
    
    # Add any keys that might have been missed by ordered_output_keys 
    # (e.g., if new fields are added to models but not to this list).
    # This ensures all data is still printed.
    for key_in_model, value_in_model in combined_log_dict_for_print.items():
        if key_in_model not in ordered_log_dict_for_print:
            ordered_log_dict_for_print[key_in_model] = value_in_model

    # Print the ordered JSON to the console.
    # Using default=str to handle datetime objects and other non-standard JSON types.
    print("\n--- Output from process_trade_log_entry (Ordered for Readability) --- ")
    try:
        print(json.dumps(ordered_log_dict_for_print, indent=2, default=str))
    except Exception as e:
        logger.error(f"Error during final JSON dump for printing: {e}")
        print(f"Error printing final JSON: {e}. Check logs.")
        
    return combined_log

# Example main block for testing (similar to the one in the original test_file.py)
# This allows running this module directly to test the full processing pipeline.
if __name__ == "__main__":
    # Attempt to reconfigure stdout and stderr to use UTF-8 for this script execution.
    # This is crucial for environments where the default encoding (e.g., cp1252 on Windows)
    # cannot handle all Unicode characters that might be in logs or print statements.
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8')
        # For older Python versions or environments without reconfigure, alternative methods
        # like setting PYTHONIOENCODING=UTF-8 environment variable before running the script
        # might be necessary if encoding issues persist.
    except Exception as e_config:
        # Log a warning if reconfiguration fails, but proceed as the script might still work
        # if problematic characters are not encountered or if the environment handles it.
        logging.warning(f"Could not reconfigure sys.stdout/stderr to UTF-8: {e_config}. Fallback to default console encoding.", exc_info=False)

    # Ensure a basic logger is configured if running standalone and no handlers are set up by the app logger.
    if not logging.getLogger().hasHandlers() or (logger.name == __name__ and not logger.hasHandlers()):
        # This condition checks if the root logger has no handlers OR if the specific fallback logger for this file has no handlers.
        # This is to avoid double logging if an app-level logger is already configured.
        logging.basicConfig(level=logging.INFO, # Use INFO for standalone runs to be less verbose than DEBUG by default.
                            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                            handlers=[logging.StreamHandler()])
        logger.info("Standalone basicConfig logger initialized for trade_parser.py __main__.")
    else:
        logger.info("Logger seems already configured, skipping basicConfig in trade_parser.py __main__.")


    logger.info("Trade Log Processor (trade_parser.py) Started - REAL LLM Mode")
    print("\nIMPORTANT: This script (trade_parser.py) will use the REAL LLM (Google Gemini). Ensure GEMINI_API_KEY is set.")
    
    print("\nPlease paste the raw trade data below. Type an empty line (press Enter twice) when done:")
    raw_trade_data_lines = []
    while True:
        try:
            line = input()
            if line == "": # Double Enter signifies end of input
                break
            raw_trade_data_lines.append(line)
        except KeyboardInterrupt:
            logger.warning("Input interrupted by user.")
            break
        except EOFError: # Handles Ctrl+D on Linux/macOS or Ctrl+Z+Enter on Windows if input stream is redirected
            logger.info("EOF detected, ending input.")
            break
    input_raw_trade_text = "\n".join(raw_trade_data_lines)

    if not input_raw_trade_text.strip():
        logger.warning("No trade data provided. Exiting.")
        print("No input received.")
    else:
        # Log a generic message for the raw input to avoid encoding issues with direct logging of user input.
        logger.info("Processing provided trade data (raw input preview suppressed due to potential encoding issues).")
        combined_log_result = process_trade_log_entry(input_raw_trade_text)

        if combined_log_result:
            logger.info(f"Trade processing complete for symbol: {combined_log_result.symbol}.")
        else:
            logger.error("Trade processing failed. See previous logs for details.")
            print("\n--- Processing Failed ---")
            print("Please check the logs for more details, especially for errors from the LLM or data validation.")
    logger.info("Trade Log Processor (trade_parser.py) Finished") 