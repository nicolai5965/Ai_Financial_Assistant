"""
Script to start the FastAPI server for the stock analysis API.
This script uses a centralized logging configuration and adjusts its behavior
based on the environment (development vs production).
"""

import os
import sys
from dotenv import load_dotenv
import uvicorn

# Add the parent directory to the Python path so that modules can be imported properly
sys.path.insert(0, os.path.abspath('.'))

# Load environment variables from .env file
load_dotenv()

# Import the centralized logger configuration and environment flags
from app.core.logging_config import get_logger, ENVIRONMENT, IS_DEVELOPMENT

# Get the pre-configured logger instance
logger = get_logger()

def main():
    """
    Main entry point to start the FastAPI server.
    Adjusts Uvicorn settings based on the environment and logs important startup events.
    """
    try:
        # Log the startup mode using the centralized logger
        logger.info("Starting Stock Analysis API server in %s mode...", ENVIRONMENT)
        
        # Retrieve the API port from the environment (defaults to 8000 if not set)
        port = int(os.environ.get("API_PORT", 8000))
        
        # Configure Uvicorn settings differently based on the environment.
        # In development mode, we enable reload for live code updates and set log_level to 'debug'.
        # In production, reload is disabled and log_level is set to 'info'.
        uvicorn_settings = {
            "host": "0.0.0.0",
            "port": port,
            "log_level": "debug" if IS_DEVELOPMENT else "info",
            "reload": True if IS_DEVELOPMENT else False,
        }
        
        logger.info("Uvicorn settings: %s", uvicorn_settings)
        
        # Run the Uvicorn server with the specified settings.
        # The app is imported dynamically from 'app.api.stock_api:app'
        uvicorn.run("app.api.stock_api:app", **uvicorn_settings)
    
    except Exception as e:
        # Log the exception with full stack trace using logger.exception for debugging purposes
        logger.exception("Failed to start the Stock Analysis API server: %s", e)
        # Exit the process with a non-zero status to indicate failure
        sys.exit(1)

if __name__ == "__main__":
    main()
