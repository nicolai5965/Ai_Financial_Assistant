import os
import json
from typing import Optional, Tuple, Any
import logging
import sys

# For LangGraph State
from typing_extensions import TypedDict # Or from typing import TypedDict for Python 3.9+

# Importing models from the .models module within the same package
from .models import TradeLogLLMExtract

# LangGraph imports
from langgraph.graph import StateGraph, END

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

# --- LangGraph State Definition ---
class GraphState(TypedDict):
    raw_trade_text: str
    llm_provider_name: str
    is_trading_data_check_passed: Optional[bool]
    user_facing_error: Optional[str]
    extracted_trade_data: Optional[TradeLogLLMExtract]

# --- Graph Nodes ---

def pre_check_node(state: GraphState) -> GraphState:
    """
    Node to pre-check if the input text is trading-related data.
    """
    logger.info("Entering pre_check_node.")
    raw_trade_text = state["raw_trade_text"]
    llm_provider_name = state["llm_provider_name"]

    try:
        from ..services.llm.llm_handler import LLMHandler
    except ImportError:
        logger.error("Failed to import LLMHandler in pre_check_node. Pre-check aborted.")
        return {
            **state, # type: ignore # TypedDict spread is fine in recent Pythons with appropriate linters
            "is_trading_data_check_passed": False,
            "user_facing_error": "System error: Pre-check module failed to load. Please contact support.",
        }

    example_trading_data = """
[2025-06-06 14:30:53	14,384.78	14,383.78	
−1.00 USD Commission for: Close short position for symbol FX:USDJPY at price 144.510 for 137674 units. Position AVG Price was 144.289000, currency: JPY, rate: 0.006920, point value: 1.000000
2025-06-06 14:10:28	Order 2054350820 for symbol FX:USDJPY has been executed at price 144.289 for 137674 units
2025-06-06 11:11:57	Call to place limit order to sell 137674 units of symbol FX:USDJPY at price 144.289 with SL 144.472 and TP 143.937]
    """

    pre_check_prompt = f"""You are a text classifier. Your task is to determine if the provided text contains information related to financial trading activities, such as trade logs, order executions, position entries/exits, commissions, or market instrument symbols.

Consider the following as an example of text that IS trading-related:
---
{example_trading_data}
---

Now, analyze the following text:
---
{raw_trade_text}
---

Based on your analysis, does the text above appear to be a log or description of financial trading activity?
Answer with only 'YES' or 'NO'."""

    try:
        handler_instance = LLMHandler(llm_provider=llm_provider_name)
        pre_check_llm = handler_instance.get_model()
        
        logger.info(f"Sending pre-check prompt to {llm_provider_name} LLM for text starting with: '{raw_trade_text[:100]}...'")
        response = pre_check_llm.invoke(pre_check_prompt)
        
        response_content = (response.content if hasattr(response, 'content') else str(response)).strip().upper()
        logger.info(f"Pre-check LLM response: {response_content}")

        if response_content == "YES":
            logger.info("Pre-check determined data IS trading-related.")
            return {**state, "is_trading_data_check_passed": True, "user_facing_error": None} # type: ignore
        elif response_content == "NO":
            logger.warning("Pre-check determined data IS NOT trading-related.")
            return {
                **state, # type: ignore
                "is_trading_data_check_passed": False,
                "user_facing_error": "The provided text does not appear to be trading-related data. Please input valid trading journal entries.",
            }
        else:
            logger.error(f"Pre-check LLM gave an unexpected response: {response_content}")
            return {
                **state, # type: ignore
                "is_trading_data_check_passed": False,
                "user_facing_error": "The system could not determine if the input is trading data due to an unexpected pre-check response. Please try again or simplify your input.",
            }
    except Exception as e:
        logger.error(f"Error during pre-check LLM interaction with {llm_provider_name}: {e}", exc_info=True)
        return {
            **state, # type: ignore
            "is_trading_data_check_passed": False,
            "user_facing_error": f"An error occurred during the data pre-check: {str(e)}. Please try again.",
        }

def extraction_node(state: GraphState) -> GraphState:
    """
    Node to perform the detailed trade extraction using the main LLM.
    """
    logger.info("Entering extraction_node.")
    raw_trade_text = state["raw_trade_text"]
    llm_provider_name = state["llm_provider_name"]

    try:
        from ..services.llm.llm_handler import LLMHandler
    except ImportError:
        logger.error("Failed to import LLMHandler in extraction_node. Extraction aborted.")
        return {
            **state, # type: ignore
            "extracted_trade_data": None,
            "user_facing_error": state.get("user_facing_error") or "System error: Extraction module failed to load. Please contact support.",
        }

    extraction_prompt = f"""Please extract trading information from the following raw text. 
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
  "exit_timestamp": "Optional[datetime string (YYYY-MM-DDTHH:MM:SS)] (single value or null)",
  "exit_price": "Optional[float] (price in quote_currency, single value or null)",
  "exit_units": "Optional[float] (single value or null)",
  "trade_events_narrative": "str (summarize key events chronologically)",
  "all_order_ids_mentioned": "Optional[str] (single string of comma-separated IDs or null, not a list)",
  "gross_pnl_from_close_event": "Optional[float] (Gross P/L from the 'Close position' log line, before commissions.)",
  "trade_type": "Optional[Literal['STOCK', 'FOREX', 'CRYPTO', 'FUTURES', 'UNKNOWN']]",
  "quote_currency": "Optional[str] (e.g., USD, DKK, EUR, unless stated otherwise from the profit / loss of the trade)",
  "conversion_rate_of_quote_to_usd": "Optional[float] (1 unit of quote_currency = X USD. If quote_currency is USD, this is 1.0. If not USD and rate is unknown, use null.)",
  "leverage": "Optional[str] (e.g., '50x', '100:1', or null if not found)",
  "total_commission_fees_usd": "Optional[float] (Sum of ALL commissions in USD. Typically a negative number.)"
}}

CRITICAL INSTRUCTIONS for handling complex trades:
1.  **Gross P&L Extraction**: If you see a `[History]` log line for "Close ... position", you MUST extract the P/L value from that line and place it in the `gross_pnl_from_close_event` field. This is the most reliable P&L figure. For example, from `Close long position... (-99.40 USD)`, you must extract -99.40.
2.  **Commission Summation for Scaled-In Trades**: A trade may have multiple 'Enter position' events (scaling in). You MUST find ALL commission entries associated with the entire trade (all entries AND the exit) and sum them together for `total_commission_fees_usd`. For example, if there are two entry commissions of -1.00 USD each and one exit commission of -1.00 USD, the correct total is -3.00.

Detailed instructions for other fields:
- symbol: The trading instrument code (e.g., FOREXCOM:USDDKK, COINBASE:SOLUSD, AAPL).
- direction: Initial trade direction (BUY or SELL).
- entry_timestamp: Timestamp of initial position opening (YYYY-MM-DDTHH:MM:SS).
- entry_price: Average entry price in the quote_currency. Prioritize 'Position AVG Price' if available.
- initial_units: Total units of the initial position.
- initial_stop_loss_price: The first stop-loss price set (in quote_currency). Null if not found.
- initial_take_profit_price: The first take-profit price set (in quote_currency). Null if not found.
- exit_timestamp, exit_price, exit_units: Single optional values for the exit event. Use null if no exit. Price is in quote_currency.
- trade_events_narrative: Concise chronological summary of the trade lifecycle.
- all_order_ids_mentioned: A single string containing all unique, actual order identifiers (e.g., "ORDER-123, ORDER-456"). Exclude dates or other numerical data. Null if none.
- trade_type: Classify the trade (STOCK, FOREX, CRYPTO, FUTURES). If unsure, use UNKNOWN. Null if not determinable.
- quote_currency: The currency of prices in the log. For USDDKK, it's DKK. For EURUSD, it's USD. For AAPL, it's USD. For SOLUSD, it's USD. Prioritize explicit mentions like "currency: DKK". Null if not determinable.
- conversion_rate_of_quote_to_usd: The rate for 1 unit of quote_currency to USD (e.g., 0.152178 for DKK if 1 DKK = 0.152178 USD). MUST be 1.0 if quote_currency is USD. If the rate from quote_currency to USD is not found in the text for a non-USD quote, use null, DO NOT TRY AND CALCULATE IT.
- leverage: Extract any mention of leverage (e.g., "leverage: 20x", "1:100"). If not found, use null.
- total_commission_fees_usd: Find ALL commission entries. Sum their values as per the CRITICAL INSTRUCTIONS above. If commissions are not in USD, convert them if possible. Report the total sum (typically a negative number). If no commissions are mentioned, use null.

Ensure all datetime strings are in YYYY-MM-DDTHH:MM:SS format.
For optional fields, use null if no information is found. Fields expecting lists should be empty lists ([]) if no relevant items are found.

Raw trade text:
```
{raw_trade_text}
```

JSON Output:"""

    llm_response_content = "" 
    try:
        handler_instance = LLMHandler(llm_provider=llm_provider_name)
        language_model = handler_instance.get_model()

        logger.info(f"Sending extraction prompt to {llm_provider_name} LLM for trade text starting with: '{raw_trade_text[:100]}...'")
        response = language_model.invoke(extraction_prompt)
        
        llm_response_content = response.content if hasattr(response, 'content') else str(response)
        
        logger.info("Received response from extraction LLM.")
        logger.debug(f"Raw LLM response content before stripping fences: {llm_response_content}")

        if llm_response_content.startswith("```json"):
            llm_response_content = llm_response_content[len("```json"):].strip()
            if llm_response_content.endswith("```"):
                llm_response_content = llm_response_content[:-len("```")]
            llm_response_content = llm_response_content.strip()
        elif llm_response_content.startswith("```"):
            llm_response_content = llm_response_content[len("```"):].strip()
            if llm_response_content.endswith("```"):
                 llm_response_content = llm_response_content[:-len("```")]
            llm_response_content = llm_response_content.strip()
        logger.debug(f"Cleaned LLM response content after stripping fences: {llm_response_content}")

        llm_data = json.loads(llm_response_content)
        extracted_data = TradeLogLLMExtract(**llm_data)
        logger.info(f"Successfully extracted and validated trade data for symbol: {extracted_data.symbol}")
        return {**state, "extracted_trade_data": extracted_data, "user_facing_error": None} # type: ignore

    except json.JSONDecodeError as e:
        error_msg = f"Error decoding LLM JSON response for extraction: {e}. Raw response: '{llm_response_content[:200]}...'"
        logger.error(error_msg)
        return {
            **state, # type: ignore
            "extracted_trade_data": None,
            "user_facing_error": "Failed to parse the extracted trade data. The format from the AI was incorrect. Please try again or simplify your input.",
        }
    except Exception as e: 
        error_msg = f"An error occurred during LLM data processing or interaction with {llm_provider_name} for extraction: {e}"
        logger.error(error_msg, exc_info=True)
        return {
            **state, # type: ignore
            "extracted_trade_data": None,
            "user_facing_error": f"An error occurred during trade data extraction: {str(e)}. Please check the input or try again.",
        }

# --- Conditional Edges ---

def should_proceed_to_extraction(state: GraphState) -> str:
    """
    Determines the next step after the pre-check.
    """
    logger.info("Evaluating condition: should_proceed_to_extraction.")
    if state.get("user_facing_error"): 
        logger.info(f"Pre-check failed or errored: {state['user_facing_error']}. Ending graph.")
        return "end_graph"
    
    if state.get("is_trading_data_check_passed") is True:
        logger.info("Pre-check passed. Proceeding to extraction_node.")
        return "extract_data"
    else:
        # This path should ideally be covered by user_facing_error being set in pre_check_node.
        # If not, it means is_trading_data_check_passed is False or None without a specific error message.
        logger.warning("is_trading_data_check_passed is False or None, but no user_facing_error from pre_check. Ending graph.")
        # The pre_check_node should always set user_facing_error if the check fails.
        return "end_graph"


# --- Workflow Definition ---
workflow = StateGraph(GraphState)

workflow.add_node("pre_checker", pre_check_node)
workflow.add_node("extractor", extraction_node)

workflow.set_entry_point("pre_checker")

workflow.add_conditional_edges(
    "pre_checker",
    should_proceed_to_extraction,
    {
        "extract_data": "extractor",
        "end_graph": END,
    },
)
workflow.add_edge("extractor", END)

# Compile the graph
app_graph = workflow.compile()


# --- Main Function to be Called ---
def get_llm_trade_extraction(raw_trade_text: str, llm_provider_name: str = "google") -> Tuple[Optional[TradeLogLLMExtract], Optional[str]]:
    """
    Extracts structured trade information using a two-step LLM process with LangGraph:
    1. Pre-checks if the text is trading data.
    2. If yes, extracts detailed trade information.

    Args:
        raw_trade_text: The raw string containing the trade log information.
        llm_provider_name: The name of the LLM provider to use.

    Returns:
        A tuple: (Optional[TradeLogLLMExtract], Optional[str])
        - The first element is the extracted trade data model if successful.
        - The second element is a user-facing error message if any step fails or if data is not trading-related.
    """
    logger.info(f"Starting LangGraph trade extraction for text: '{raw_trade_text[:100]}...' with provider: {llm_provider_name}")
    
    initial_state: GraphState = {
        "raw_trade_text": raw_trade_text,
        "llm_provider_name": llm_provider_name,
        "is_trading_data_check_passed": None,
        "user_facing_error": None,
        "extracted_trade_data": None,
    }

    try:
        final_state_dict = app_graph.invoke(initial_state)
        
        if not isinstance(final_state_dict, dict): # Should be a dict based on GraphState
            logger.error(f"LangGraph invocation did not return a dictionary. Got: {type(final_state_dict)}")
            # This could happen if the graph is configured to stream intermediate states as a list.
            # Assuming standard invoke returns the final state dict. If it's a list, take the last one.
            if isinstance(final_state_dict, list) and final_state_dict:
                final_state_dict = final_state_dict[-1]
                if not isinstance(final_state_dict, dict):
                     return None, "A system error occurred during processing. Unexpected graph output structure."
            else:
                return None, "A system error occurred during processing. Unexpected graph output."


        logger.info(f"LangGraph execution finished. Final state keys: {list(final_state_dict.keys())}")

        # Accessing TypedDict items using .get() is safer
        extracted_data = final_state_dict.get("extracted_trade_data")
        user_error = final_state_dict.get("user_facing_error")

        if user_error:
            logger.warning(f"Process finished with user-facing error: {user_error}")
            return None, user_error 
        
        if extracted_data:
            # Ensure extracted_data is of the correct type, Pydantic model should handle this.
            logger.info(f"Successfully processed and extracted trade data via LangGraph for symbol: {extracted_data.symbol if hasattr(extracted_data, 'symbol') else 'N/A'}")
            return extracted_data, None
        else:
            # This case implies the graph ended, no specific user error was set, and no data was extracted.
            # This might happen if pre-check was 'NO' and user_facing_error was correctly set,
            # or if an edge case in conditional logic led to END without error/data.
            # The should_proceed_to_extraction logic and node error handling should prevent this
            # unless pre_check says NO and user_facing_error was correctly set.
            # If user_error is None here, it implies the path was valid but didn't produce data.
            logger.warning("LangGraph finished, no extracted data and no explicit user error. This might indicate a non-trading input or an unexpected path.")
            # If pre_check_node correctly sets user_facing_error for "NO", this path shouldn't be hit with user_error as None.
            # If it is, it means "NO" isn't creating an error message, or extraction failed silently.
            # The pre_check_node is designed to set user_facing_error for "NO".
            # So, if user_error is None here, it's an unexpected state.
            return None, "Processing completed, but no trade data was extracted. The input might not be recognized or an issue occurred."


    except Exception as e:
        logger.error(f"An unexpected error occurred during LangGraph execution: {e}", exc_info=True)
        return None, f"A critical system error occurred during processing: {str(e)}" 