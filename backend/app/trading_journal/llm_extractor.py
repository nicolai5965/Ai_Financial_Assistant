import os
import json
from typing import Optional
import logging
import sys

# Importing models from the .models module within the same package
from .models import TradeLogLLMExtract

# Logger setup
try:
    # Attempt to import the get_logger function from the app's core logging configuration.
    from ..core.logging_config import get_logger
    logger = get_logger()
except ImportError:
    # Fallback to basic Python logging if the app-specific logger cannot be imported.
    print("Warning: Could not import get_logger from app.core.logging_config. Using basic Python logging for llm_extractor.py.")
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.DEBUG)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        try:
            if hasattr(sys.stderr, 'reconfigure'):
                sys.stderr.reconfigure(encoding='utf-8')
        except Exception as e:
            print(f"Notice: Could not set UTF-8 encoding on fallback logger stream handler in llm_extractor.py: {e}. Using platform default.")
            pass
        logger.addHandler(handler)
    logger.info("Fallback logger initialized for llm_extractor.py.")

def get_llm_trade_extraction(raw_trade_text: str, llm_provider_name: str = "google") -> Optional[TradeLogLLMExtract]:
    """
    Extracts structured trade information from raw text using a specified LLM provider.

    The function constructs a detailed prompt for the LLM, sends the raw trade text,
    parses the LLM's JSON response, and validates it against the TradeLogLLMExtract model.
    It also handles potential Markdown fences (```json ... ```) that the LLM might add.

    Args:
        raw_trade_text: The raw string containing the trade log information.
        llm_provider_name: The name of the LLM provider to use (e.g., "google").
                           Defaults to "google".

    Returns:
        An Optional[TradeLogLLMExtract] object if extraction and validation are successful,
        otherwise None if any error occurs (e.g., LLM import failure, JSON decoding error,
        Pydantic validation error, or other exceptions during LLM interaction).
    """
    logger.info(f"Attempting to use {llm_provider_name} LLM provider for trade extraction.")
    try:
        # Dynamically import LLMHandler to avoid import errors if the module is run in isolation
        # or if the main app structure isn't fully available.
        # The path assumes this module is in backend/app/trading_journal/
        from ..services.llm.llm_handler import LLMHandler
        
        # Comprehensive prompt for the LLM, detailing expected JSON structure and field instructions.
        prompt = f"""Please extract trading information from the following raw text. 
Provide the output in a valid JSON format according to this Pydantic model structure. 
IMPORTANT: The JSON output MUST NOT contain duplicate keys. Each key must appear only once. 
Ensure all field names exactly match the Pydantic model shown below.

{{ 
  "symbol": "str",
  "direction": "Literal['BUY', 'SELL']",
  "entry_timestamp": "datetime string (YYYY-MM-DDTHH:MM:SS)",
  "entry_price": "float (price in quote_currency)",
  "initial_units": "float",
  "initial_stop_loss_price": "Optional[float] (price in quote_currency)",
  "initial_take_profit_price": "Optional[float] (price in quote_currency)",
  "exit_timestamp": "List[datetime string (YYYY-MM-DDTHH:MM:SS)]",
  "exit_price": "List[float] (price in quote_currency)",
  "exit_units": "List[float]",
  "trade_events_narrative": "str (summarize key events chronologically)",
  "all_order_ids_mentioned": "List[str] (only include actual order IDs, not dates or other numbers)",
  "trade_type": "Optional[Literal['STOCK', 'FOREX', 'CRYPTO', 'FUTURES', 'UNKNOWN']]",
  "quote_currency": "Optional[str] (e.g., USD, DKK, EUR)",
  "conversion_rate_of_quote_to_usd": "Optional[float] (1 unit of quote_currency = X USD. If quote_currency is USD, this is 1.0. If not USD and rate is unknown, use null.)",
  "leverage": "Optional[str] (e.g., '50x', '100:1', or null if not found)",
  "total_commission_fees_usd": "Optional[float] (Sum of all commissions in USD. If commissions in logs are not in USD, convert them if possible using a rate found in the text. These are usually costs, so sum of -1 and -1 should be -2.0. If no commissions, use null.)"
}}

Detailed instructions for fields:
- symbol: The trading instrument code (e.g., FOREXCOM:USDDKK, COINBASE:SOLUSD, AAPL).
- direction: Initial trade direction (BUY or SELL).
- entry_timestamp: Timestamp of initial position opening (YYYY-MM-DDTHH:MM:SS).
- entry_price: Average entry price in the quote_currency. Prioritize 'Position AVG Price' if available.
- initial_units: Total units of the initial position.
- initial_stop_loss_price: The first stop-loss price set (in quote_currency). Null if not found.
- initial_take_profit_price: The first take-profit price set (in quote_currency). Null if not found.
- exit_timestamp, exit_price, exit_units: Lists for all exit events. Prices are in quote_currency. Empty lists ([]) if no exits.
- trade_events_narrative: Concise chronological summary of the trade lifecycle.
- all_order_ids_mentioned: Unique, actual order identifiers (e.g., "ORDER-123"). Exclude dates or other numerical data. Empty list ([]) if none.
- trade_type: Classify the trade (STOCK, FOREX, CRYPTO, FUTURES). If unsure, use UNKNOWN. Null if not determinable.
- quote_currency: The currency of prices in the log. For USDDKK, it's DKK. For EURUSD, it's USD. For AAPL, it's USD. For SOLUSD, it's USD. Prioritize explicit mentions like "currency: DKK". Null if not determinable.
- conversion_rate_of_quote_to_usd: The rate for 1 unit of quote_currency to USD (e.g., 0.152178 for DKK if 1 DKK = 0.152178 USD). MUST be 1.0 if quote_currency is USD. If the rate from quote_currency to USD is not found in the text for a non-USD quote, use null.
- leverage: Extract any mention of leverage (e.g., "leverage: 20x", "1:100"). If not found, use null.
- total_commission_fees_usd: Find all commission entries. Sum their values. If commissions are specified in a currency other than USD, use the 'conversion_rate_of_quote_to_usd' (if found from the text, or if it can be inferred for the quote_currency) to convert each commission to USD *before* summing. If commissions are already in USD (e.g., "-1.00USD Commission"), sum them directly. Report the total sum (this is typically a negative number if commissions are costs). If no commissions are mentioned, use null.

Ensure all datetime strings are in YYYY-MM-DDTHH:MM:SS format.
For optional fields, use null if no information is found. Fields expecting lists should be empty lists ([]) if no relevant items are found.

Raw trade text:
```
{raw_trade_text}
```

JSON Output:"""

        # Initialize and use the LLMHandler
        handler_instance = LLMHandler(llm_provider=llm_provider_name)
        language_model = handler_instance.get_model()

        logger.info(f"Sending prompt to {llm_provider_name} LLM for trade text starting with: '{raw_trade_text[:100]}...'")
        response = language_model.invoke(prompt)
        
        # Extract content from response, accommodating different LLM response structures
        llm_response_content = response.content if hasattr(response, 'content') else str(response)
        
        logger.info("Received response from LLM.")
        logger.debug(f"Raw LLM response content before stripping fences: {llm_response_content}")

        # Strip Markdown JSON fences (e.g., ```json ... ``` or ``` ... ```) if present
        if llm_response_content.startswith("```json"):
            llm_response_content = llm_response_content[len("```json"):].strip()
            if llm_response_content.endswith("```"):
                llm_response_content = llm_response_content[:-len("```")]
            llm_response_content = llm_response_content.strip()
        elif llm_response_content.startswith("```"): # Handles cases where LLM might forget the 'json' language hint
            llm_response_content = llm_response_content[len("```"):].strip()
            if llm_response_content.endswith("```"):
                 llm_response_content = llm_response_content[:-len("```")]
            llm_response_content = llm_response_content.strip()

        logger.debug(f"Cleaned LLM response content after stripping fences: {llm_response_content}")

        # Parse the cleaned JSON string into a dictionary
        llm_data = json.loads(llm_response_content)
        # Validate and create the Pydantic model instance
        extracted_data = TradeLogLLMExtract(**llm_data)
        logger.info(f"Successfully extracted and validated trade data for symbol: {extracted_data.symbol}")
        return extracted_data

    except ImportError:
        logger.error(f"Failed to import LLMHandler for {llm_provider_name}. Ensure 'app.services.llm.llm_handler.py' is accessible and app structure is correct. LLM extraction aborted.")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding LLM JSON response: {e}. Raw response content was: {llm_response_content}. LLM extraction aborted.")
        return None
    except Exception as e: 
        # Catch-all for other errors, including Pydantic validation errors or LLM interaction issues.
        logger.error(f"An error occurred during LLM data processing or interaction with {llm_provider_name}: {e}. LLM extraction aborted.", exc_info=True)
        return None 