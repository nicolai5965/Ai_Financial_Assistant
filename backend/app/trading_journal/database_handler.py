import sqlite3
import os
from datetime import datetime
import logging
import sys
from typing import Optional

# Assuming CombinedTradeLog will be imported from .models
# For now, we'll define its structure conceptually for schema generation
# from .models import CombinedTradeLog 

# Logger setup
try:
    from ..core.logging_config import get_logger
    logger = get_logger() # Pass module name for better log filtering
except ImportError:
    print("Warning: Could not import get_logger from app.core.logging_config. Using basic Python logging for database_handler.py.")
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.DEBUG)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout) # Log to stdout for clarity
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        # UTF-8 configuration for fallback logger
        try:
            if hasattr(sys.stderr, 'reconfigure'): # Python 3.7+
                sys.stderr.reconfigure(encoding='utf-8')
            if hasattr(sys.stdout, 'reconfigure'): # Python 3.7+
                sys.stdout.reconfigure(encoding='utf-8')
        except Exception as e:
            # This might fail in some environments (e.g., if streams are not tty), but it's worth a try.
            print(f"Notice: Could not set UTF-8 encoding on fallback logger stream handler in database_handler.py: {e}. Using platform default.", file=sys.stderr)
            pass
        logger.addHandler(handler)
    logger.info("Fallback logger initialized for database_handler.py.")

# Define the database file path and directory
DATABASE_DIR = os.path.join(os.path.dirname(__file__), 'db')
DATABASE_NAME = "trading_log.db"
DATABASE_PATH = os.path.join(DATABASE_DIR, DATABASE_NAME)

def get_db_connection() -> sqlite3.Connection:
    """
    Establishes a connection to the SQLite database.
    Creates the database directory if it doesn't exist.

    Returns:
        sqlite3.Connection: A connection object to the database.
    """
    os.makedirs(DATABASE_DIR, exist_ok=True)
    logger.info(f"Database directory ensured at: {DATABASE_DIR}")
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        # Enable foreign key support for future use if needed
        conn.execute("PRAGMA foreign_keys = ON;")
        logger.info(f"Successfully connected to database: {DATABASE_PATH}")
        return conn
    except sqlite3.Error as e:
        logger.error(f"Error connecting to database {DATABASE_PATH}: {e}", exc_info=True)
        raise

def create_trades_table(conn: sqlite3.Connection):
    """
    Creates the 'trades' table in the database if it doesn't already exist.
    The schema is based on the CombinedTradeLog Pydantic model.

    Args:
        conn: sqlite3.Connection object.
    """
    try:
        cursor = conn.cursor()
        # Schema definition for the 'trades' table
        # Based on CombinedTradeLog after refactoring
        # Optional fields are nullable by default in SQLite unless NOT NULL is specified.
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                status TEXT,
                final_pnl_usd REAL,
                actual_r_multiple_on_risk REAL,
                direction TEXT NOT NULL,
                entry_timestamp TEXT NOT NULL, -- ISO8601 format
                entry_price REAL NOT NULL,
                initial_units REAL NOT NULL,
                exit_timestamp TEXT,          -- ISO8601 format
                exit_price REAL,
                exit_units REAL,
                initial_total_risk_usd REAL,
                expected_pnl_at_initial_tp_usd REAL,
                expected_r_multiple_at_initial_tp REAL,
                total_commission_fees_usd REAL,
                trade_type TEXT,
                quote_currency TEXT,
                conversion_rate_of_quote_to_usd REAL,
                leverage TEXT,
                initial_stop_loss_price REAL,
                initial_take_profit_price REAL,
                initial_risk_per_unit_usd REAL,
                trade_duration_seconds REAL,
                all_order_ids_mentioned TEXT, 
                trade_events_narrative TEXT NOT NULL,
                trade_duration_readable TEXT
            )
        """)
        conn.commit()
        logger.info("Table 'trades' created or already exists.")
    except sqlite3.Error as e:
        logger.error(f"Error creating 'trades' table: {e}", exc_info=True)
        # No need to raise here, let the caller handle connection state

def _datetime_to_iso(dt: Optional[datetime]) -> Optional[str]:
    """Converts an optional datetime object to an ISO 8601 string, or None."""
    if dt is None:
        return None
    return dt.isoformat()

# Placeholder for CombinedTradeLog type hint if the actual import is problematic during generation
# This is a common pattern when generating code that depends on other generated/modified parts.
# Replace 'Any' with 'CombinedTradeLog' from .models when integrating.
from typing import Any as CombinedTradeLogTypeHint # Actual: from .models import CombinedTradeLog

def insert_trade(conn: sqlite3.Connection, trade_log: CombinedTradeLogTypeHint):
    """
    Inserts a single trade log entry into the 'trades' table.

    Args:
        conn: sqlite3.Connection object.
        trade_log: A CombinedTradeLog Pydantic model instance.
    """
    insert_sql = """
        INSERT INTO trades (
            symbol, status, final_pnl_usd, actual_r_multiple_on_risk,
            direction, entry_timestamp, entry_price, initial_units,
            exit_timestamp, exit_price, exit_units,
            initial_total_risk_usd, expected_pnl_at_initial_tp_usd, expected_r_multiple_at_initial_tp,
            total_commission_fees_usd, trade_type, quote_currency, conversion_rate_of_quote_to_usd,
            leverage, initial_stop_loss_price, initial_take_profit_price, initial_risk_per_unit_usd,
            trade_duration_seconds, all_order_ids_mentioned, trade_events_narrative, trade_duration_readable
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    try:
        cursor = conn.cursor()
        # Prepare data for insertion, converting datetimes to ISO strings
        # This assumes CombinedTradeLog has a .model_dump() method like Pydantic models
        trade_data = trade_log.model_dump()

        data_tuple = (
            trade_data.get('symbol'),
            trade_data.get('status'),
            trade_data.get('final_pnl_usd'),
            trade_data.get('actual_r_multiple_on_risk'),
            trade_data.get('direction'),
            _datetime_to_iso(trade_data.get('entry_timestamp')), 
            trade_data.get('entry_price'),
            trade_data.get('initial_units'),
            _datetime_to_iso(trade_data.get('exit_timestamp')), 
            trade_data.get('exit_price'),
            trade_data.get('exit_units'),
            trade_data.get('initial_total_risk_usd'),
            trade_data.get('expected_pnl_at_initial_tp_usd'),
            trade_data.get('expected_r_multiple_at_initial_tp'),
            trade_data.get('total_commission_fees_usd'),
            trade_data.get('trade_type'),
            trade_data.get('quote_currency'),
            trade_data.get('conversion_rate_of_quote_to_usd'),
            trade_data.get('leverage'),
            trade_data.get('initial_stop_loss_price'),
            trade_data.get('initial_take_profit_price'),
            trade_data.get('initial_risk_per_unit_usd'),
            trade_data.get('trade_duration_seconds'),
            trade_data.get('all_order_ids_mentioned'), 
            trade_data.get('trade_events_narrative'),
            trade_data.get('trade_duration_readable')
        )
        cursor.execute(insert_sql, data_tuple)
        conn.commit()
        logger.info(f"Successfully inserted trade for symbol: {trade_data.get('symbol')}, DB ID: {cursor.lastrowid}")
        return cursor.lastrowid # Return the ID of the newly inserted row
    except sqlite3.Error as e:
        logger.error(f"Error inserting trade for symbol {trade_log.symbol if hasattr(trade_log, 'symbol') else 'N/A'}: {e}", exc_info=True)
        # Depending on desired error handling, you might want to rollback or raise
        conn.rollback() # Rollback on error
        raise # Re-raise the exception to be handled by the caller
    except AttributeError as e:
        logger.error(f"Missing attribute in trade_log, likely not a CombinedTradeLog Pydantic model or model_dump() failed: {e}", exc_info=True)
        # This could happen if trade_log is not what we expect
        raise
    except Exception as e: # Catch any other unexpected errors
        logger.error(f"An unexpected error occurred during trade insertion: {e}", exc_info=True)
        conn.rollback()
        raise

def get_all_trades(conn: sqlite3.Connection, limit: int = 20, offset: int = 0) -> list[dict]:
    """
    Retrieves a paginated list of all trades from the database, ordered by entry time descending.

    Args:
        conn: sqlite3.Connection object.
        limit: The maximum number of trades to retrieve.
        offset: The starting point from which to retrieve trades.

    Returns:
        A list of dictionaries, where each dictionary represents a trade.
    """
    trades = []
    try:
        # Use sqlite3.Row as the row_factory to get dict-like rows
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM trades
            ORDER BY entry_timestamp DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        rows = cursor.fetchall()
        # Convert Row objects to standard dicts
        trades = [dict(row) for row in rows]
        logger.info(f"Successfully retrieved {len(trades)} trades from DB with limit={limit}, offset={offset}.")
    except sqlite3.Error as e:
        logger.error(f"Error retrieving trades from database: {e}", exc_info=True)
        # In case of error, return an empty list; the caller can decide how to handle.
    return trades

def get_total_trade_count(conn: sqlite3.Connection) -> int:
    """
    Retrieves the total number of trades in the 'trades' table.

    Args:
        conn: sqlite3.Connection object.

    Returns:
        The total count of trades as an integer.
    """
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(id) FROM trades")
        # fetchone() will return a tuple, e.g., (15,)
        result = cursor.fetchone()
        count = result[0] if result else 0
        logger.debug(f"Total trade count from DB: {count}")
        return count
    except sqlite3.Error as e:
        logger.error(f"Error getting total trade count: {e}", exc_info=True)
        return 0

def get_trade_statistics(conn: sqlite3.Connection) -> dict:
    """
    Calculates and retrieves key performance indicators (KPIs) from the trades table.

    Args:
        conn: sqlite3.Connection object.

    Returns:
        A dictionary containing the calculated statistics.
        Returns a default dictionary with zero/null values if an error occurs or no data is present.
    """
    stats = {
        "total_pnl": 0,
        "win_count": 0,
        "loss_count": 0,
        "avg_expected_r": None,
        "avg_actual_r": None,
    }
    try:
        # We need dict-like access for the cursor result
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # This single, optimized query calculates all required metrics
        # - SUM pnl for total profit/loss
        # - FILTER clause (PostgreSQL/SQLite 3.30+) is efficient for conditional aggregation
        # - AVG calculates the mean, automatically handling NULLs
        cursor.execute("""
            SELECT
                SUM(final_pnl_usd) AS total_pnl,
                COUNT(id) FILTER (WHERE final_pnl_usd > 0) AS win_count,
                COUNT(id) FILTER (WHERE final_pnl_usd < 0) AS loss_count,
                AVG(expected_r_multiple_at_initial_tp) AS avg_expected_r,
                AVG(actual_r_multiple_on_risk) AS avg_actual_r
            FROM trades
        """)
        
        result = cursor.fetchone()
        
        if result:
            # Directly update the stats dictionary from the query result.
            # The keys in the result object match the 'AS' aliases in the SQL.
            # Coalesce None results to the default values.
            stats["total_pnl"] = result["total_pnl"] if result["total_pnl"] is not None else 0
            stats["win_count"] = result["win_count"] if result["win_count"] is not None else 0
            stats["loss_count"] = result["loss_count"] if result["loss_count"] is not None else 0
            stats["avg_expected_r"] = result["avg_expected_r"] # Can be None if no data
            stats["avg_actual_r"] = result["avg_actual_r"] # Can be None if no data
            logger.info(f"Successfully calculated trade statistics: {stats}")
        else:
            logger.warning("get_trade_statistics query returned no result. Using default zero values.")

    except sqlite3.Error as e:
        logger.error(f"Error calculating trade statistics: {e}", exc_info=True)
        # Return the default zero-value dictionary on error
    finally:
        # It's good practice to reset the row_factory if it was changed for a specific function
        conn.row_factory = None
        
    return stats

if __name__ == '__main__':
    # Example usage / basic test
    logger.info("Running database_handler.py directly for testing.")

    # This is a mock CombinedTradeLog structure for testing purposes.
    # In a real scenario, you'd import CombinedTradeLog from .models
    class MockCombinedTradeLog:
        def __init__(self, **kwargs):
            self.symbol = kwargs.get('symbol')
            self.direction = kwargs.get('direction')
            self.entry_timestamp = kwargs.get('entry_timestamp')
            self.entry_price = kwargs.get('entry_price')
            self.initial_units = kwargs.get('initial_units')
            self.initial_stop_loss_price = kwargs.get('initial_stop_loss_price')
            self.initial_take_profit_price = kwargs.get('initial_take_profit_price')
            self.exit_timestamp = kwargs.get('exit_timestamp')
            self.exit_price = kwargs.get('exit_price')
            self.exit_units = kwargs.get('exit_units')
            self.trade_events_narrative = kwargs.get('trade_events_narrative')
            self.all_order_ids_mentioned = kwargs.get('all_order_ids_mentioned')
            self.trade_type = kwargs.get('trade_type')
            self.quote_currency = kwargs.get('quote_currency')
            self.conversion_rate_of_quote_to_usd = kwargs.get('conversion_rate_of_quote_to_usd')
            self.leverage = kwargs.get('leverage')
            self.total_commission_fees_usd = kwargs.get('total_commission_fees_usd')
            self.final_pnl_usd = kwargs.get('final_pnl_usd')
            self.status = kwargs.get('status')
            self.initial_risk_per_unit_usd = kwargs.get('initial_risk_per_unit_usd')
            self.initial_total_risk_usd = kwargs.get('initial_total_risk_usd')
            self.expected_pnl_at_initial_tp_usd = kwargs.get('expected_pnl_at_initial_tp_usd')
            self.expected_r_multiple_at_initial_tp = kwargs.get('expected_r_multiple_at_initial_tp')
            self.actual_r_multiple_on_risk = kwargs.get('actual_r_multiple_on_risk')
            self.trade_duration_seconds = kwargs.get('trade_duration_seconds')
            self.trade_duration_readable = kwargs.get('trade_duration_readable')

        def model_dump(self):
            return self.__dict__

    # Create a dummy trade log for testing
    mock_trade = MockCombinedTradeLog(
        symbol="TEST/USD",
        direction="BUY",
        entry_timestamp=datetime.now(),
        entry_price=100.0,
        initial_units=1.0,
        initial_stop_loss_price=90.0,
        initial_take_profit_price=120.0,
        exit_timestamp=datetime.now(), # Or None
        exit_price=110.0,             # Or None
        exit_units=1.0,               # Or None
        trade_events_narrative="Test trade narrative.",
        all_order_ids_mentioned="ID123,ID456", # Or None
        trade_type="CRYPTO",
        quote_currency="USD",
        conversion_rate_of_quote_to_usd=1.0,
        leverage="10x",
        total_commission_fees_usd=-1.0,
        final_pnl_usd=9.0,
        status="WIN",
        initial_risk_per_unit_usd=10.0,
        initial_total_risk_usd=10.0,
        expected_pnl_at_initial_tp_usd=20.0,
        expected_r_multiple_at_initial_tp=2.0,
        actual_r_multiple_on_risk=0.9,
        trade_duration_seconds=3600.0,
        trade_duration_readable="1h 0m 0s"
    )

    test_conn = None
    try:
        logger.info("Attempting to get DB connection...")
        test_conn = get_db_connection()
        logger.info("DB connection successful. Attempting to create table...")
        create_trades_table(test_conn)
        logger.info("Table creation successful/table exists. Attempting to insert trade...")
        
        # Test with a trade that has all fields
        insert_trade(test_conn, mock_trade)
        logger.info(f"Successfully inserted mock trade for {mock_trade.symbol}.")

        # Test with a trade that has some optional fields as None
        mock_trade_optional_none = MockCombinedTradeLog(
            symbol="TEST2/USD",
            direction="SELL",
            entry_timestamp=datetime.now(),
            entry_price=200.0,
            initial_units=0.5,
            trade_events_narrative="Test trade with minimal optional data.",
            quote_currency="USD",
            conversion_rate_of_quote_to_usd=1.0,
            # Most optional fields are None by default in MockCombinedTradeLog if not provided
        )
        insert_trade(test_conn, mock_trade_optional_none)
        logger.info(f"Successfully inserted mock trade (optional fields None) for {mock_trade_optional_none.symbol}.")


        # Example of how to query (optional, for verification)
        cursor = test_conn.cursor()
        cursor.execute("SELECT id, symbol, entry_timestamp, final_pnl_usd FROM trades ORDER BY id DESC LIMIT 5")
        rows = cursor.fetchall()
        logger.info("Last 5 trades from DB:")
        for row in rows:
            logger.info(row)

        # Test new functions
        logger.info("\n--- Testing get_all_trades and get_total_trade_count ---")
        total_trades = get_total_trade_count(test_conn)
        logger.info(f"Total trade count: {total_trades}")
        
        all_trades_paginated = get_all_trades(test_conn, limit=5, offset=0)
        logger.info(f"Retrieved {len(all_trades_paginated)} trades for first page:")
        for trade in all_trades_paginated:
            # Print a few fields to verify it's a dict
            logger.info(f"  ID: {trade['id']}, Symbol: {trade['symbol']}, PNL: {trade['final_pnl_usd']}")

        # Test get_trade_statistics
        logger.info("\n--- Testing get_trade_statistics ---")
        stats = get_trade_statistics(test_conn)
        logger.info(f"Trade statistics: {stats}")

    except Exception as e:
        logger.error(f"Error during database_handler.py self-test: {e}", exc_info=True)
    finally:
        if test_conn:
            logger.info("Closing DB connection.")
            test_conn.close()
    logger.info("database_handler.py self-test finished.") 