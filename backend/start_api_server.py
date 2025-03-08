"""
Script to start the FastAPI server for the stock analysis API.
"""
import uvicorn
import os
import sys
from dotenv import load_dotenv

# Add the parent directory to the Python path so we can import the app package
sys.path.insert(0, os.path.abspath('.'))

# Load environment variables
load_dotenv()

def main():
    """Start the FastAPI server."""
    print("Starting Stock Analysis API server...")
    
    # Get port from environment or use default
    port = int(os.environ.get("API_PORT", 8000))
    
    # Import directly using a string to avoid package-level imports
    # This bypasses the app.api.__init__.py file and its imports
    uvicorn.run(
        "app.api.stock_api:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main() 