# Backend Documentation

|--------------------------------|
|        Project Structure       |
|--------------------------------|

```
backend/
├── .env                  # Environment variables configuration
├── app/                  # Main application package
│   ├── api/              # API endpoints and routing
│   │   ├── __init__.py   # Package initialization
│   │   ├── main.py       # FastAPI application and endpoints for main functionality
│   │   └── stock_api.py  # FastAPI server for stock analysis endpoints
│   ├── core/             # Core application components
│   │   ├── __init__.py   # Package initialization
│   │   ├── settings.py   # Application settings and configuration
│   │   ├── logging_config.py # Logging configuration
│   │   └── validate_api_keys.py # API key validation utilities
│   ├── models/           # Data models and schemas
│   │   ├── __init__.py   # Package initialization
│   │   ├── report_models.py # Report-related data models
│   │   └── structured_report_nodes.py # Node definitions for report generation
│   ├── stock_analysis/   # Stock market analysis functionality
│   │   ├── __init__.py   # Package initialization with API exports
│   │   ├── stock_data_fetcher.py # Stock data retrieval and cleaning
│   │   ├── stock_indicators.py # Technical indicators calculation
│   │   ├── stock_data_charting.py # Chart creation and visualization
│   │   └── stock_analysis.py # Legacy file (deprecated)
│   ├── db/               # Database related code
│   ├── services/         # Business logic and external service integrations
│   │   ├── llm/          # Language model related services
│   │   │   ├── __init__.py # Package initialization
│   │   │   ├── llm_handler.py # LLM provider integration
│   │   │   └── fetch_project_prompts.py # Retrieves prompts from LangSmith with lazy loading
│   │   ├── web/          # Web content related services
│   │   │   ├── __init__.py # Package initialization
│   │   │   ├── web_content_extractor.py # Web scraping utilities
│   │   │   └── url_topic_analyzer.py # URL content analysis
│   │   ├── search/       # Search related services
│   │   │   ├── __init__.py # Package initialization
│   │   │   ├── tavily_search.py # Tavily search API integration
│   │   │   └── search_results_formatter.py # Formats search results
│   │   ├── reports/      # Report generation services
│   │   │   ├── __init__.py # Package initialization
│   │   │   └── report_graph_builders.py # Graph-based report generation pipelines with lazy initialization
│   │   └── __init__.py   # Package initialization
│   ├── utils/            # Utility functions and helpers
│   │   ├── __init__.py   # Package initialization
│   │   └── system_checks.py # System environment validation
│   └── __init__.py       # Main package initialization
├── logs/                 # Application logs directory
│   └── app.log           # Application log file
├── tests/                # Test suite
│   ├── __init__.py       # Test package initialization
│   └── test_file.py      # Test cases
├── BACKEND_DOCS.md       # Documentation for the backend
├── requirements.txt      # Python dependencies
├── run.py                # Application entry point for report generation
├── start_api_server.py   # Script to start the FastAPI server for stock analysis
``` 

|--------------------------------|
|        Folder Explanation      |
|--------------------------------|

### 1. `app/`
- **Purpose**: The main Python package containing all application code, organized into subpackages by responsibility. This is the core of the application where all the business logic, API endpoints, and utilities reside.
- **Location**: `backend/app/`

### 1.1 `app/api/`
- **Purpose**: Contains FastAPI route definitions, endpoint handlers, and API-specific middleware. This is where HTTP requests are received and responses are sent. The API layer should be thin, delegating business logic to the services layer.
- **Location**: `backend/app/api/`
- **Key Components**:
  - `main.py`: FastAPI endpoints for the report generation functionality
  - `stock_api.py`: Dedicated FastAPI application for stock analysis with endpoints for analyzing stocks and health checks

### 1.2 `app/core/`
- **Purpose**: Contains essential application components like configuration management, security utilities, logging configuration, and other foundational elements that the rest of the application depends on. These are the building blocks that support the entire application.
- **Location**: `backend/app/core/`

### 1.3 `app/models/`
- **Purpose**: Contains data structure definitions, type hints, and schemas used throughout the application, particularly for the report generation pipeline. These models define the shape of data as it flows through the application.
- **Location**: `backend/app/models/`

### 1.4 `app/stock_analysis/`
- **Purpose**: Contains functionality for stock market data retrieval, analysis, and visualization. This module provides tools for fetching stock data, applying technical indicators, and generating interactive charts.
- **Location**: `backend/app/stock_analysis/`
- **Key Components**:
  - `stock_data_fetcher.py`: Handles fetching and cleaning of stock market data
  - `stock_indicators.py`: Implements technical indicator calculations and visualization
  - `stock_data_charting.py`: Manages chart creation and customization
  - `__init__.py`: Provides a clean public API for the package

### 1.5 `app/db/`
- **Purpose**: Contains database-related code, including connection management, ORM models, repositories, and migrations. This layer abstracts database interactions from the rest of the application, providing a clean API for data persistence.
- **Location**: `backend/app/db/`

### 1.6 `app/services/`
- **Purpose**: Contains business logic and integrations with external services. This layer implements the core functionality of the application and is organized into subpackages by domain.
- **Location**: `backend/app/services/`

#### 1.6.1 `app/services/llm/`
- **Purpose**: Contains services related to language model interactions. This includes handling different LLM providers, managing prompts, and processing LLM responses.
- **Location**: `backend/app/services/llm/`
- **Key Components**:
  - `llm_handler.py`: Implements a factory pattern for LLM provider management with lazy initialization
    - **BaseLLMHandler**: Abstract base class with common initialization logic and interface
    - **Provider-specific handlers** (OpenAIHandler, AnthropicHandler, GoogleHandler): Implement provider-specific logic
    - **LLMHandler**: Factory class that returns the appropriate handler based on the provider
    - Uses lazy loading to defer heavy imports and API connections until actually needed
    - Caches initialized models to prevent repeated expensive operations
  - `fetch_project_prompts.py`: Manages prompt retrieval from LangSmith with lazy loading pattern for one prompt at a time using the `get_formatted_prompt` function.

  - Example of using the 'get_formatted_prompt' function:
  [```
import asyncio
from app.services.llm.fetch_project_prompts import get_formatted_prompt

async def get_formatted_prompt_async(prompt_name: str, report_size: str) -> str:
    """
    Asynchronously fetches and formats a prompt by offloading the synchronous
    get_formatted_prompt function to a separate thread.
    """
    return await asyncio.to_thread(get_formatted_prompt, prompt_name, report_size)

async def fetch_multiple_prompts(prompt_names: list, report_size: str = "Standard") -> dict:
    """
    Concurrently fetches multiple prompts from LangSmith.
    
    :param prompt_names: List of prompt names to fetch.
    :param report_size: The report size to format the prompts for.
    :return: Dictionary mapping prompt names to their formatted content.
    """
    tasks = [
        get_formatted_prompt_async(prompt_name, report_size)
        for prompt_name in prompt_names
    ]
    results = await asyncio.gather(*tasks)
    return dict(zip(prompt_names, results))

if __name__ == "__main__":
    # Example usage: fetch multiple prompts concurrently.
    prompt_list = [
        "report_structure",
        "query_writer_instructions",
        "section_writer_instructions",
    ] # ... add more prompts if needed, these are just examples
    
    prompts = asyncio.run(fetch_multiple_prompts(prompt_list, report_size="Standard"))
  ```]


#### 1.6.2 `app/services/web/`
- **Purpose**: Contains services for web content extraction and analysis. This includes scraping web pages, extracting relevant content, and analyzing the topics and sentiment of web content.
- **Location**: `backend/app/services/web/`
- **Note**: These components are not currently in active use but are maintained for potential future applications requiring web content analysis.
- **Key Components**:
  - `web_content_extractor.py`: Utilities for scraping and extracting content from web pages
  - `url_topic_analyzer.py`: Analysis tools for determining topics and content relevance of URLs

#### 1.6.3 `app/services/search/`
- **Purpose**: Contains services for performing web searches and processing search results. This includes integrating with search APIs like Tavily and formatting the search results for consumption by other parts of the application.
- **Location**: `backend/app/services/search/`

#### 1.6.4 `app/services/reports/`
- **Purpose**: Contains services for generating structured reports. This includes building report pipelines, orchestrating the report generation process, and formatting the final output.
- **Location**: `backend/app/services/reports/`
- **Key Components**:
  - `report_graph_builders.py`: Defines and builds state graphs for report generation using langgraph
    - Uses lazy initialization pattern through `get_final_report_builder()` function
    - Prevents graph construction at import time to avoid unwanted side effects
    - Provides a clean API for accessing the report builder when needed

### 1.7 `app/utils/`
- **Purpose**: Contains utility functions and helpers that support the application but aren't tied to specific business logic. These are general-purpose functions that can be used across different parts of the application.
- **Location**: `backend/app/utils/`

### 2. `logs/`
- **Purpose**: Contains application log files generated by the logging system. These logs are useful for debugging, monitoring, and auditing application behavior.
- **Location**: `backend/logs/`

### 3. `tests/`
- **Purpose**: Contains the test suite for the application. This includes unit tests, integration tests, and end-to-end tests to ensure the application works as expected.
- **Location**: `backend/tests/`

### 4. `start_api_server.py`
- **Purpose**: Entry point script for starting the FastAPI stock analysis server.
- **Location**: `backend/start_api_server.py`
- **Key Features**:
  - Configures the uvicorn server to serve the stock analysis API
  - Handles environment setup and loading of environment variables
  - Sets port configuration and server options
  - Includes hot-reloading for development

|--------------------------------|
|        File Explanation        |
|--------------------------------|

|---------------------|
|     api folder      |
|---------------------|

### 1. `app/api/__init__.py`
- **Purpose**: This file is used to initialize the API package.
- **Location**: `backend/app/api/__init__.py`
- **Key Features**:
  - Uses conditional imports to avoid circular import issues
  - Exposes the stock API application through the package

### 2. `app/api/main.py`
- **Purpose**: This file is the main file for the report generation API.
- **Location**: `backend/app/api/main.py`

### 3. `app/api/stock_api.py`
- **Purpose**: This file provides a FastAPI server for stock market analysis.
- **Location**: `backend/app/api/stock_api.py`
- **Key Features**:
  - Defines request and response models using Pydantic
  - Implements endpoints for stock analysis and health checks
  - Provides comprehensive error handling and logging
  - Includes CORS middleware for cross-origin requests
  - Contains validation logic for interval ranges and other parameters

|---------------------|
|     core folder     |
|---------------------|

### 4. `app/core/__init__.py`
- **Purpose**: This file is used to initialize the core package.
- **Location**: `backend/app/core/__init__.py`

### 5. `app/core/settings.py`
- **Purpose**: This file contains application settings and configuration management.
- **Location**: `backend/app/core/settings.py`

### 6. `app/core/logging_config.py`
- **Purpose**: This file configures logging for the application, setting up log formats, handlers, and log rotation.
- **Location**: `backend/app/core/logging_config.py`

### 7. `app/core/validate_api_keys.py`
- **Purpose**: This file contains utilities for validating API keys.
- **Location**: `backend/app/core/validate_api_keys.py`

|---------------------|
|  stock_analysis folder |
|---------------------|

### 8. `app/stock_analysis/__init__.py`
- **Purpose**: This file initializes the stock_analysis package and provides a clean public API for its functionality.
- **Location**: `backend/app/stock_analysis/__init__.py`
- **Key Features**:
  - Exposes core functions at the package level for easy importing
  - Defines the public API through the `__all__` list
  - Provides package-level documentation

### 9. `app/stock_analysis/stock_data_fetcher.py`
- **Purpose**: This file centralizes all data fetching and cleaning logic for stock market data.
- **Location**: `backend/app/stock_analysis/stock_data_fetcher.py`
- **Key Functions**:
  - `fetch_stock_data(tickers, start_date, end_date, interval)`: Retrieves historical stock data using yfinance
  - `filter_market_hours(ticker, data)`: Filters data to include only rows during trading hours
  - `get_market_hours(ticker)`: Retrieves market hours information for a given ticker
- **Key Features**:
  - Handles exchange-specific timezone and trading hour adjustments
  - Includes robust error handling and logging
  - Returns clean, filtered DataFrames ready for analysis

### 10. `app/stock_analysis/stock_indicators.py`
- **Purpose**: This file contains functions for calculating technical indicators and returning Plotly traces.
- **Location**: `backend/app/stock_analysis/stock_indicators.py`
- **Key Functions**:
  - `calculate_20day_SMA(data, ticker)`: Calculates 20-Day Simple Moving Average
  - `calculate_20day_EMA(data, ticker)`: Calculates 20-Day Exponential Moving Average
  - `calculate_20day_Bollinger_Bands(data, ticker)`: Calculates 20-Day Bollinger Bands
  - `calculate_VWAP(data, ticker)`: Calculates Volume Weighted Average Price
  - `add_indicator_to_chart(fig, data, indicator_name, ticker)`: Adds indicator traces to an existing chart
- **Key Features**:
  - Uses a dispatcher pattern to map indicator names to calculation functions
  - Returns Plotly traces ready to be added to charts
  - Designed for easy addition of new indicators in the future

### 11. `app/stock_analysis/stock_data_charting.py`
- **Purpose**: This file handles all chart building and visualization functionality.
- **Location**: `backend/app/stock_analysis/stock_data_charting.py`
- **Key Functions**:
  - `build_candlestick_chart(ticker, data)`: Creates a basic candlestick chart
  - `build_line_chart(ticker, data)`: Creates a line chart using closing prices
  - `apply_rangebreaks(fig, ticker, data, interval)`: Adds x-axis rangebreaks to remove gaps
  - `add_selected_indicators(fig, data, ticker, indicators)`: Adds selected indicators to a chart
  - `analyze_ticker(ticker, data, indicators, interval, chart_type)`: Orchestrates the entire chart creation process
  - `main()`: Test function for local development
- **Key Features**:
  - Supports multiple chart types (candlestick and line)
  - Handles x-axis rangebreaks for intraday data
  - Integrates with the indicators module for overlaying technical analysis

### 12. `app/stock_analysis/stock_analysis.py` (Deprecated)
- **Purpose**: Legacy file maintained for backward compatibility only.
- **Location**: `backend/app/stock_analysis/stock_analysis.py`
- **Key Features**:
  - Imports functionality from the new modular structure
  - Issues deprecation warnings to guide users to the new modules
  - Will be removed in a future version

|---------------------|
|     db folder       |
|---------------------|

Nothing to see here yet.

|---------------------|
|     models folder   |
|---------------------|

### 13. `app/models/__init__.py`
- **Purpose**: This file is used to initialize the models package.
- **Location**: `backend/app/models/__init__.py`

### 14. `app/models/report_models.py`
- **Purpose**: This file contains data models related to reports.
- **Location**: `backend/app/models/report_models.py`

### 15. `app/models/structured_report_nodes.py`
- **Purpose**: This file contains node definitions for report generation.
- **Location**: `backend/app/models/structured_report_nodes.py`
- **Key Features**:
  - Implements lazy loading pattern for formatted prompts using `get_formatted_prompts()` function
  - Only fetches LangChain prompts when explicitly needed, preventing unnecessary API calls
  - Provides centralized access to prompts for all report generation nodes

|---------------------|
|    services folder  |
|---------------------|

### 16. `app/services/__init__.py`
- **Purpose**: This file is used to initialize the services package and provides access to core services.
- **Location**: `backend/app/services/__init__.py`
- **Key Features**:
  - Imports and re-exports key service functions like `fetch_prompts()` without triggering immediate execution
  - Uses carefully structured imports to minimize side effects during module loading

|---------------------|
|     utils folder    |
|---------------------|

### 17. `app/utils/__init__.py`
- **Purpose**: This file is used to initialize the utils package.
- **Location**: `backend/app/utils/__init__.py`

### 18. `app/utils/system_checks.py`
- **Purpose**: This file contains utilities for checking system requirements.
- **Location**: `backend/app/utils/system_checks.py`

|---------------------|
|    logs folder      |
|---------------------|

### 19. `logs/app.log`
- **Purpose**: This file contains application logs generated by the logging system. The logs include timestamps, log levels, and structured information about application events and errors.
- **Location**: `backend/logs/app.log`

|---------------------|
|    root folder      |
|---------------------|

### 20. `BACKEND_DOCS.md`
- **Purpose**: This file contains the documentation for the backend.
- **Location**: `backend/BACKEND_DOCS.md`

### 21. `requirements.txt`
- **Purpose**: This file contains the dependencies for the backend.
- **Location**: `backend/requirements.txt`
- **Key Features**:
  - Includes FastAPI, uvicorn, and python-multipart for the web server
  - Contains yfinance for stock data retrieval
  - Includes plotting libraries like matplotlib and plotly

### 22. `run.py`
- **Purpose**: This file is the entry point for the report generation functionality.
- **Location**: `backend/run.py`

### 23. `start_api_server.py`
- **Purpose**: This file is the entry point for starting the stock analysis API server.
- **Location**: `backend/start_api_server.py`
- **Key Features**:
  - Uses uvicorn to run the FastAPI application
  - Sets up environment variables and Python path
  - Configures server options and port settings

### 24. `.env`
- **Purpose**: This file contains the environment variables for the backend.
- **Location**: `backend/.env`

|--------------------------------|
|       Design Patterns          |
|--------------------------------|

### 1. Lazy Loading Pattern
- **Purpose**: Delays the initialization or loading of resources until they are actually needed.
- **Implementation**:
  - **`fetch_project_prompts.py`**: Uses `fetch_prompts()` function to retrieve prompts from LangChain Hub only when explicitly called, avoiding unnecessary API calls during imports.
  - **`structured_report_nodes.py`**: Uses `get_formatted_prompts()` function to lazily load formatted prompts.
  - **`report_graph_builders.py`**: Uses `get_final_report_builder()` to construct the report generation graph only when needed.
  - **`llm_handler.py`**: The `BaseLLMHandler` class defers model initialization until first use with an `initialize_model()` method that's only called when needed.
    - Provider-specific heavy imports happen only inside the `initialize_model()` method
    - API connections are established only when a model is actually requested
    - Once initialized, the model instance is cached for subsequent calls
- **Benefits**:
  - Reduces unnecessary API calls and resource consumption
  - Improves application startup time
  - Allows parts of the application to be imported without triggering all dependencies
  - Makes the application more modular and less tightly coupled

### 2. Factory Pattern
- **Purpose**: Centralizes the creation of complex objects to ensure consistency and encapsulation.
- **Implementation**:
  - **`llm_handler.py`**: The `LLMHandler` class acts as a factory for creating provider-specific handler instances:
    - `__new__` method inspects the requested provider and returns the appropriate handler
    - Abstracts away provider-specific details while maintaining a simple, unified API
    - Each provider (OpenAI, Anthropic, Google) has its own handler class with specialized logic
  - **`stock_indicators.py`**: Uses a dictionary-based factory approach to map indicator names to calculation functions
- **Benefits**:
  - Encapsulates provider-specific logic
  - Provides a consistent interface for creating language model instances
  - Makes switching between providers easier
  - Improves modularity and maintainability by separating concerns

### 3. Logger Configuration Pattern
- **Purpose**: Centralizes logging configuration to ensure consistent logging across the application.
- **Implementation**:
  - **`logging_config.py`**: Provides a centralized configuration for application logging:
    - Configures log formats, handlers, and log rotation
    - Uses a factory function (`get_logger()`) to provide consistent logger instances
    - Ensures logs are properly saved to the logs directory
- **Benefits**:
  - Provides consistent logging behavior across the application
  - Centralizes logging configuration in one place
  - Makes it easy to adjust logging behavior application-wide
  - Ensures important information is properly captured for debugging and monitoring

### 4. Module-Level API Pattern
- **Purpose**: Provides a clean and consistent API for a package or module.
- **Implementation**:
  - **`stock_analysis/__init__.py`**: Explicitly exports only the intended public functions and classes:
    - Imports specific functions from the module's internal files
    - Defines `__all__` to limit what's exported when using `from package import *`
    - Provides package-level documentation
- **Benefits**:
  - Makes it clear what functionality is intended for public use
  - Simplifies importing for users of the package
  - Encapsulates implementation details

### 5. Adapter Pattern
- **Purpose**: Provides a consistent interface to different underlying systems or services.
- **Implementation**:
  - **`stock_api.py`**: Adapts between the HTTP API interface and the internal stock analysis functions:
    - Converts JSON request parameters to function arguments
    - Translates function return values to JSON responses
    - Handles errors and exceptions in a consistent way
- **Benefits**:
  - Decouples the client interface from the implementation
  - Makes it easier to evolve either side independently
  - Provides a consistent error handling approach

|--------------------------------|
|      Stock Analysis API         |
|--------------------------------|

### 1. Starting the Stock Analysis API
- **Command**: `python start_api_server.py`
- **Default Port**: 8000 (can be changed via environment variable API_PORT)
- **Available Endpoints**:
  - `/api/stocks/analyze` (POST): Analyze stock data and return visualization
  - `/api/health` (GET): Check if the API is running correctly

### 2. API Request Format
The stock analysis endpoint accepts the following parameters:
```json
{
  "ticker": "AAPL",         // Stock ticker symbol
  "days": 10,               // Number of days to look back (optional, default: 10)
  "interval": "1d",         // Data interval (optional, default: "1d")
  "indicators": [           // List of technical indicators (optional, default: [])
    "20-Day SMA",
    "20-Day EMA",
    "20-Day Bollinger Bands",
    "VWAP"
  ],
  "chart_type": "candlestick" // Chart type: "candlestick" or "line" (optional, default: "candlestick")
}
```

### 3. API Response Format
The API returns a JSON object with the following structure:
```json
{
  "chart": "{...}",  // Plotly figure as JSON string
  "ticker": "AAPL"   // The requested ticker symbol
}
```

### 4. Interval Validation
The API validates interval parameters and enforces these limits:
- `1m`: maximum 7 days of history
- `2m`, `5m`, `15m`, `30m`, `60m`, `90m`: maximum 60 days of history
- `1h`: maximum 730 days of history
- `1d`, `1wk`, `1mo`: no limit

### 5. Error Handling
The API returns appropriate HTTP status codes:
- 200 OK: Successful request
- 404 Not Found: When no data is found for the requested ticker or timeframe
- 500 Internal Server Error: For unexpected errors during processing

### 6. CORS Configuration
The API is configured to allow cross-origin requests from any origin, which is suitable for development. For production, you should restrict this to specific origins.