import os
import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

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
print(f"Logs will be written to: {log_file_path}")

# Create a logger instance for the backend
logger = logging.getLogger("backendLogger")
logger.setLevel(logging.DEBUG)  # Capture all log levels; adjust as needed

# Set up a TimedRotatingFileHandler to rotate logs at midnight
handler = TimedRotatingFileHandler(
    log_file_path,
    when="midnight",  # Rotate at midnight
    interval=1,       # Interval of 1 day
    backupCount=7     # Keep the logs for the last 7 days
)
handler.suffix = "%Y-%m-%d"  # Append the date to the log file name

# Define a log message format
formatter = logging.Formatter(
    "%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
handler.setFormatter(formatter)
logger.addHandler(handler)

# Optionally, add a console handler for real-time logging during development
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

# Add a test log to confirm logging is working
logger.info("Logging system initialized")