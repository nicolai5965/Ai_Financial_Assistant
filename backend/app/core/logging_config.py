import os
import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

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
        backupCount=7     # Keep the logs for the last 7 days
    )
    file_handler.suffix = "%Y-%m-%d"  # Append the date to the log file name
    file_handler.setLevel(logging.DEBUG)  # All logs go to the file

    # Define a log message format
    formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Add a console handler with environment-appropriate level
    console_handler = logging.StreamHandler()
    console_handler.setLevel(CONSOLE_LOG_LEVEL)  # Use the module-level constant
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    print(f"Logger initialized: File logging at DEBUG level, console logging at {logging.getLevelName(CONSOLE_LOG_LEVEL)} level")
    if not IS_DEVELOPMENT:
        print("Set ENVIRONMENT=development for more verbose console logging")
    
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

