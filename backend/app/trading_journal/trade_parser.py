import os
import json
from typing import Optional, Tuple
import logging
import sys
import sqlite3 # Added for error handling during DB operations

# Importing from other modules within the trading_journal package
from .models import CombinedTradeLog, TradeLogLLMExtract # Assuming all models are in .models
from .llm_extractor import get_llm_trade_extraction
from .calculations import calculate_additional_trade_data, format_duration # format_duration might not be directly used here but good to note its location
# Import database handler functions
from .database_handler import get_db_connection, create_trades_table, insert_trade

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

def process_trade_log_entry(raw_trade_text: str) -> Tuple[Optional[CombinedTradeLog], Optional[str]]:
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
        A tuple containing:
        - An Optional[CombinedTradeLog] object if the entire process is successful.
        - An Optional[str] containing a user-facing error message if any step fails.
    """
    logger.info(f"Step 1: Attempting to extract trade data using LLM for text starting with: '{raw_trade_text[:100]}...'")
    # Defaulting to Google provider; this could be made configurable if needed.
    extracted_data, error_message = get_llm_trade_extraction(raw_trade_text, llm_provider_name="google") 

    if error_message:
        logger.error(f"LLM extraction failed: {error_message}. Aborting trade log processing.")
        return None, error_message

    if not extracted_data:
        logger.error("LLM extraction failed to return data, but gave no error message. Aborting.")
        # Provide a generic error if the extractor unexpectedly returns (None, None)
        return None, "LLM extraction failed for an unknown reason."

    logger.info(f"Step 2: LLM Extraction successful for symbol: {extracted_data.symbol}."
                  f" Extracted trade type: {extracted_data.trade_type}, Quote Ccy: {extracted_data.quote_currency}.")
    logger.debug(f"LLM Extracted data dump: {extracted_data.model_dump_json(indent=2)}")
    
    # --- Implicit Conversion Rate Derivation ---
    # This logic block handles cases where a non-USD currency is used (e.g., USDDKK)
    # but no explicit conversion rate was found in the trade text.
    if (extracted_data.quote_currency != "USD" and
            not extracted_data.conversion_rate_of_quote_to_usd and
            "USD" in extracted_data.symbol.upper() and
            # The exit price is the most accurate point for P&L conversion.
            extracted_data.exit_price is not None and extracted_data.exit_price != 0):
        
        try:
            # For FX pairs like 'USDDKK', the price is 'DKK per USD'.
            # To get the USD value of 1 DKK, we invert the exit price.
            implicit_rate = 1.0 / extracted_data.exit_price
            
            # Update the in-memory model before it's passed to the calculator
            extracted_data.conversion_rate_of_quote_to_usd = implicit_rate
            
            logger.info(
                f"Derived implicit conversion rate for {extracted_data.symbol}. "
                f"Using 1 / exit_price ({extracted_data.exit_price}) = {implicit_rate:.6f}"
            )
        except ZeroDivisionError:
             # This is guarded by the if-condition but included for robustness.
            logger.warning("Attempted to derive conversion rate with exit_price of zero. Skipping.")

    # --- End Derivation ---

    logger.info(f"Step 3: Calculating additional financial metrics for symbol: {extracted_data.symbol}...")
    calculated_data = calculate_additional_trade_data(extracted_data)
    logger.info(f"Calculations complete for symbol: {extracted_data.symbol}. PNL USD: {calculated_data.final_pnl_usd}, Status: {calculated_data.status}")
    logger.debug(f"Calculated data dump: {calculated_data.model_dump_json(indent=2)}")

    # Combine extracted and calculated data into the final log object.
    combined_log_data_dict = {**extracted_data.model_dump(), **calculated_data.model_dump()}
    combined_log = CombinedTradeLog(**combined_log_data_dict)
    
    logger.info(f"Step 4: Final combined trade log created for symbol: {combined_log.symbol}. Final PNL USD: {combined_log.final_pnl_usd}")
    logger.debug(f"Combined log (raw dump): {combined_log.model_dump_json(indent=2)}")

    # --- Database Integration --- 
    logger.info(f"Step 5: Attempting to save trade log for symbol: {combined_log.symbol} to database...")
    db_conn = None # Initialize db_conn to None for finally block
    new_trade_id = None
    try:
        db_conn = get_db_connection()
        create_trades_table(db_conn) # Ensure table exists
        new_trade_id = insert_trade(db_conn, combined_log)
        logger.info(f"Successfully saved trade log for symbol: {combined_log.symbol} to database with ID: {new_trade_id}.")
        # Add the new ID to the object before returning it
        if new_trade_id:
            combined_log.id = new_trade_id
    except sqlite3.Error as e:
        logger.error(f"Database error while processing trade for symbol {combined_log.symbol}: {e}", exc_info=True)
        # If DB operation fails, we cannot consider the process successful.
        return None, f"A database error occurred: {e}"
    except Exception as e:
        # Catch any other unexpected errors during DB interaction
        logger.error(f"An unexpected error occurred during database operation for symbol {combined_log.symbol}: {e}", exc_info=True)
        return None, f"An unexpected error occurred during the database operation: {e}"
    finally:
        if db_conn:
            db_conn.close()
            logger.info(f"Database connection closed for symbol: {combined_log.symbol}.")
    # --- End Database Integration ---

    # The console output block is being removed as this function will now be
    # primarily used by the API, which handles its own responses.
    # The `if __name__ == "__main__"` block below can still be used for direct
    # command-line testing, and it can handle its own printing.

    return combined_log, None

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
        combined_log_result, error_message = process_trade_log_entry(input_raw_trade_text)

        if error_message:
            logger.error(f"Trade processing failed with message: {error_message}")
            print("\n--- Processing Failed ---")
            print(f"Error: {error_message}")
        elif combined_log_result:
            logger.info(f"Trade processing complete for symbol: {combined_log_result.symbol}.")
            
            # Define the desired order for console output for readability.
            ordered_output_keys = [
                "id", "symbol", "direction", "status", "final_pnl_usd", "actual_r_multiple_on_risk",
                "initial_total_risk_usd", "expected_pnl_at_initial_tp_usd", "expected_r_multiple_at_initial_tp",
                "trade_type", "quote_currency", "conversion_rate_of_quote_to_usd",
                "entry_timestamp", "entry_price", "initial_units", "leverage", 
                "initial_stop_loss_price", "initial_take_profit_price", "initial_risk_per_unit_usd",
                "exit_timestamp", "exit_price", "exit_units",
                "total_commission_fees_usd", "trade_duration_readable", "trade_duration_seconds", 
                "all_order_ids_mentioned", "trade_events_narrative"
            ]
            # Create an ordered dictionary for printing
            combined_log_dict_for_print = combined_log_result.model_dump()
            ordered_log_dict_for_print = {key: combined_log_dict_for_print.get(key) for key in ordered_output_keys if key in combined_log_dict_for_print}
            
            print("\n--- Output from process_trade_log_entry (Ordered for Readability) --- ")
            try:
                print(json.dumps(ordered_log_dict_for_print, indent=2, default=str))
            except Exception as e:
                logger.error(f"Error during final JSON dump for printing: {e}")
        else:
            logger.error("Trade processing failed. See previous logs for details.")
            print("\n--- Processing Failed ---")
            print("Please check the logs for more details, especially for errors from the LLM or data validation.")
    logger.info("Trade Log Processor (trade_parser.py) Finished") 