from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import sqlite3
from datetime import datetime

# Assuming all models and handlers are accessible from the app structure
try:
    from ...trading_journal.models import CombinedTradeLog
    from ...trading_journal.database_handler import get_db_connection, get_all_trades, get_total_trade_count
    from ...trading_journal.trade_parser import process_trade_log_entry # Import the processor
    from ...core.logging_config import get_logger
except ImportError:
    # Fallback for isolated development/testing if needed
    from backend.app.trading_journal.models import CombinedTradeLog
    from backend.app.trading_journal.database_handler import get_db_connection, get_all_trades, get_total_trade_count
    from backend.app.trading_journal.trade_parser import process_trade_log_entry # Import the processor
    from backend.app.core.logging_config import get_logger


# Get the logger
logger = get_logger()

# Create a new router
router = APIRouter(
    prefix="/api/journal",
    tags=["Trading Journal"],
    responses={404: {"description": "Not found"}},
)


# --- Pydantic Models for API Response ---

class TradeSubmissionRequest(BaseModel):
    """
    Pydantic model for the request body when submitting a new trade.
    """
    raw_trade_text: str = Field(..., description="The raw, multi-line text of the trade log to be processed.")

class TradeResponse(CombinedTradeLog):
    """
    Pydantic model for a single trade response, including the database ID.
    Inherits all fields from CombinedTradeLog and adds 'id'.
    """
    id: int

    class Config:
        orm_mode = True # Deprecated in Pydantic v2, use from_attributes=True
        from_attributes = True # Allows creating model from ORM objects or dicts

class PaginatedTradesResponse(BaseModel):
    """
    Pydantic model for the paginated response for trades.
    """
    trades: List[TradeResponse]
    total_count: int
    page: int
    limit: int
    total_pages: int


# --- API Endpoint Definition ---

@router.post("/trades", response_model=TradeResponse, status_code=201)
async def submit_new_trade(request: TradeSubmissionRequest):
    """
    Submits a new trade log from raw text for processing and storage.
    This endpoint will use the AI extractor, calculate metrics, and save to the database.
    """
    logger.info("Received new trade submission request.")
    logger.debug(f"Raw text received: {request.raw_trade_text[:150]}...") # Log first few chars

    if not request.raw_trade_text or not request.raw_trade_text.strip():
        raise HTTPException(status_code=400, detail="raw_trade_text cannot be empty.")

    try:
        # This function now handles LLM extraction, calculation, and DB insertion
        # It returns a tuple: (log_data, error_message)
        combined_log, error_message = process_trade_log_entry(request.raw_trade_text)

        # If an error message is returned, it means processing failed at some point.
        if error_message:
            logger.error(f"Trade processing failed with an error: {error_message}")
            # 422 Unprocessable Entity is a good status code for validation/processing errors.
            raise HTTPException(
                status_code=422,
                detail=error_message # Pass the specific error message to the frontend.
            )

        # This case would be unusual with the new logic, but as a safeguard:
        if not combined_log:
            logger.error("Trade processing returned no data and no error. This is an unexpected state.")
            raise HTTPException(
                status_code=500, # Internal Server Error for unexpected states.
                detail="An unexpected internal error occurred: processing finished without data or a specific error message."
            )
        
        logger.info(f"Successfully processed and saved new trade with ID: {combined_log.id}")
        return combined_log

    except HTTPException:
        # Re-raise HTTPExceptions directly to let FastAPI handle them.
        raise
    except Exception as e:
        # Catch-all for any other unexpected errors during processing
        logger.exception(f"An unexpected critical error occurred during trade submission: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An internal server error occurred: {e}"
        )

@router.get("/trades", response_model=PaginatedTradesResponse)
async def get_trades_paginated(
    page: int = Query(1, ge=1, description="Page number to retrieve"),
    limit: int = Query(20, ge=1, le=100, description="Number of trades per page")
):
    """
    Retrieves a paginated list of trade logs from the database.
    The trades are ordered by the most recent entry timestamp first.
    """
    db_conn = None
    try:
        # Get DB connection
        db_conn = get_db_connection()
        
        # Calculate offset
        offset = (page - 1) * limit
        
        # Fetch data and total count concurrently
        # (For SQLite, true concurrency isn't happening, but this is a good pattern)
        trades_data = get_all_trades(db_conn, limit, offset)
        total_count = get_total_trade_count(db_conn)
        
        # Calculate total pages
        total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1

        logger.info(f"API: Found {total_count} total trades. Returning page {page} of {total_pages} with {len(trades_data)} trades.")
        
        # Assemble and validate response using Pydantic models
        response_data = {
            "trades": trades_data, # Pydantic will validate each dict in the list against TradeResponse
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
        }
        return PaginatedTradesResponse(**response_data)

    except Exception as e:
        logger.exception(f"API Error: Failed to retrieve paginated trades. Error: {e}")
        # Raise an HTTP exception that FastAPI will handle
        raise HTTPException(
            status_code=500,
            detail="An internal server error occurred while retrieving trade data."
        )
    finally:
        if db_conn:
            db_conn.close()
            logger.debug("API: Database connection closed for get_trades_paginated.") 