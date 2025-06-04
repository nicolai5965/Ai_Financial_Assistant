import os
import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path
import sys # Import sys for stdout/stderr reconfiguration

# ========= ENVIRONMENT CONFIGURATION =========
# Set these constants once at the module level
ENVIRONMENT = os.environ.get("ENVIRONMENT", "production").lower()
IS_DEVELOPMENT = ENVIRONMENT == "development"
CONSOLE_LOG_LEVEL = logging.DEBUG if IS_DEVELOPMENT else logging.WARNING
# ============================================

# Get the absolute path to the backend directory (2 levels up from this file)
# This ensures the logs directory is found correctly regardless of where the script is run from
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
LOG_DIR = os.path.join(BACKEND_DIR, "logs")

# Create logs directory if it doesn't exist
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)
    print(f"Created log directory at: {LOG_DIR}")

# Define the log file path
log_file_path = os.path.join(LOG_DIR, "app.log")

# Create a logger instance for the backend
logger = logging.getLogger("backendLogger")

# Flag to track if logger has been configured
_logger_configured = False

def configure_logger():
    """Configure the logger with handlers if not already configured."""
    global _logger_configured

    if _logger_configured:
        return logger

    # Check if the logger already has handlers to prevent duplicates
    if logger.hasHandlers():
        # Logger already has handlers, just return it
        _logger_configured = True
        return logger

    # Print only during first configuration
    print(f"Logs will be written to: {log_file_path}")

    # Set the base logger level to capture everything
    logger.setLevel(logging.DEBUG)

    # Set up a TimedRotatingFileHandler to rotate logs at midnight
    file_handler = TimedRotatingFileHandler(
        log_file_path,
        when="midnight",  # Rotate at midnight
        interval=1,       # Interval of 1 day
        backupCount=7,    # Keep the logs for the last 7 days
        encoding='utf-8'  # Explicitly set UTF-8 for file handler for consistency
    )
    file_handler.suffix = "%Y-%m-%d"  # Append the date to the log file name
    file_handler.setLevel(logging.DEBUG)  # All logs go to the file

    # Define a log message format including filename and line number <<-- MODIFIED HERE
    formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(name)s - [%(filename)s:%(lineno)d] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Attempt to reconfigure stdout and stderr for UTF-8 console output
    # This should be done before the StreamHandler is instantiated.
    try:
        if hasattr(sys.stdout, 'reconfigure') and (not sys.stdout.encoding or sys.stdout.encoding.lower() != 'utf-8'):
            sys.stdout.reconfigure(encoding='utf-8')
            # Using logger.debug for this message as it's part of logger setup, 
            # but print to stderr if logger isn't fully ready or if this needs to be seen regardless of level.
            print("Note: Reconfigured sys.stdout to UTF-8 in logging_config.", file=sys.stderr)
        if hasattr(sys.stderr, 'reconfigure') and (not sys.stderr.encoding or sys.stderr.encoding.lower() != 'utf-8'):
            sys.stderr.reconfigure(encoding='utf-8')
            print("Note: Reconfigured sys.stderr to UTF-8 in logging_config.", file=sys.stderr)
    except Exception as e_config:
        # If reconfiguration fails, print a warning to stderr.
        print(f"Warning: Could not reconfigure sys.stdout/stderr to UTF-8 in logging_config: {e_config}. Console logging might have encoding issues with special characters.", file=sys.stderr)

    # Add a console handler with environment-appropriate level
    console_handler = logging.StreamHandler()
    console_handler.setLevel(CONSOLE_LOG_LEVEL)  # Use the module-level constant
    # Use the SAME formatter for the console handler so it also shows file/line
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    print(f"Logger initialized: File logging at DEBUG level (UTF-8), console logging at {logging.getLevelName(CONSOLE_LOG_LEVEL)} level (attempted UTF-8).", file=sys.stderr)
    if not IS_DEVELOPMENT:
        print("Set ENVIRONMENT=development for more verbose console logging", file=sys.stderr)

    _logger_configured = True
    return logger

def get_logger():
    """Get the configured logger instance."""
    if not _logger_configured:
        configure_logger()
    return logger

# Ensure logger is not propagating to the root logger
# This prevents duplicate logs when the logger is used in different modules
logger.propagate = False

# --- Example Usage (in another file, e.g., main.py) ---
# from your_logger_module import get_logger # Assuming your config is in 'your_logger_module.py'
#
# logger = get_logger()
#
# def some_function():
#     logger.info("This is an info message from some_function.")
#     logger.warning("This is a warning.")
#
# if __name__ == "__main__":
#     logger.debug("Starting the application.")
#     some_function()
#     logger.error("An error occurred somewhere.", exc_info=True) # exc_info adds traceback