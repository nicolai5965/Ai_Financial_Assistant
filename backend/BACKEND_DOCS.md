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
│   │   ├── stock_models.py # Stock-related data models and schemas
│   │   └── structured_report_nodes.py # Node definitions for report generation
│   ├── stock_analysis/   # Stock market analysis functionality
│   │   ├── __init__.py   # Package initialization with API exports
│   │   ├── stock_data_fetcher.py # Stock data retrieval and cleaning
│   │   ├── stock_indicators.py # Technical indicators calculation
│   │   ├── stock_data_charting.py # Chart creation and visualization
│   │   ├── indicator_panels.py # Multi-panel chart organization system
│   │   ├── market_hours.py    # Market hours tracking functionality
│   │   ├── kpi_manager.py # KPI management and orchestration
│   │   ├── kpi/          # Specialized KPI calculation modules
│   │   │   ├── __init__.py # Package initialization
│   │   │   ├── price_metrics.py # Price-related KPI calculations
│   │   │   ├── volume_metrics.py # Volume-related KPI calculations
│   │   │   ├── volatility_metrics.py # Volatility-related KPI calculations
│   │   │   ├── fundamental_metrics.py # Fundamental financial metrics
│   │   │   ├── sentiment_metrics.py # Market sentiment metrics
│   │   │   └── kpi_utils.py # Shared utilities for KPI calculations
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
└── start_api_server.py   # Script to start the FastAPI server for stock analysis
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
  - `indicator_panels.py`: Provides a system for organizing technical indicators into logical panel groups
  - `market_hours.py`: Provides functionality to track market hours and trading schedules for different exchanges
  - `kpi_manager.py`: Calculates key performance indicators (KPIs) for financial analysis
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

#### 1.6.4 `app/services/financial/`
- **Purpose**: Contains services for fetching financial data and calculating financial metrics. This includes retrieving fundamental financial data, calculating KPIs, and processing financial reports.
- **Location**: `backend/app/services/financial/`
- **Key Components**:
  - `financial_data_fetcher.py`: Retrieves financial data from various sources (Yahoo Finance, Alpha Vantage, etc.)
  - `financial_metrics.py`: Calculates financial metrics and KPIs based on the retrieved data

#### 1.6.5 `app/services/reports/`
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
- **Purpose**: Entry point script for starting the FastAPI stock analysis API server.
- **Location**: `backend/start_api_server.py`
- **Key Features**:
  - **Centralized Environment Setup**: Loads environment variables from a .env file and adds the project's root to the Python path
  - **Centralized Logging**: Uses pre-configured logger from app/core/logging_config.py for consistent log formatting and levels
  - **Environment-Aware Configuration**: Adjusts server settings based on development/production environment:
    - Development mode: Enables live-reloading and debug-level logging
    - Production mode: Disables live-reloading and uses info-level logging
  - **Robust Error Handling**: Wraps startup code in try/except with full stack trace logging
  - **Flexible Port Configuration**: Uses environment variable API_PORT with fallback to default port 8000

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
- **Key Classes**:
  - `IndicatorConfig`: Pydantic model for technical indicator configuration:
    - `name`: The indicator name
    - `panel`: Optional panel assignment (main, oscillator, macd, volume, volatility)
    - Various indicator-specific parameters (window, fast_window, etc.)
  - `StockAnalysisRequest`: Pydantic model for stock analysis requests
- **Key Features**:
  - Defines request and response models using Pydantic
  - Implements endpoints for stock analysis and health checks
  - Provides comprehensive error handling and logging
  - Includes CORS middleware for cross-origin requests
  - Contains validation logic for interval ranges and other parameters
  - Processes complex indicator configurations with custom parameters and panel assignments

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
  - `get_market_hours(ticker)`: Retrieves market hours information for a given ticker
- **Key Features**:
  - Handles exchange-specific timezone information
  - Includes robust error handling and logging
  - Returns clean DataFrames ready for analysis

### 10. `app/stock_analysis/stock_indicators.py`
- **Purpose**: This file contains functions for calculating technical indicators and returning Plotly traces.
- **Location**: `backend/app/stock_analysis/stock_indicators.py`
- **Key Functions**:
  - `determine_window_size(data, default_window)`: Dynamically calculates appropriate window size based on available data
  - `_get_window_size(data, window, default_window)`: Helper function to standardize window size handling across all indicator functions
  - `calculate_SMA(data, ticker, window=None, default_window=20)`: Calculates Simple Moving Average with dynamic or custom window size
  - `calculate_EMA(data, ticker, window=None, default_window=20)`: Calculates Exponential Moving Average with dynamic or custom window size
  - `calculate_Bollinger_Bands(data, ticker, window=None, default_window=20, std_dev=2)`: Calculates Bollinger Bands with dynamic or custom window size
  - `calculate_VWAP(data, ticker)`: Calculates Volume Weighted Average Price
  - `calculate_RSI(data, ticker, window=None, default_window=14)`: Calculates Relative Strength Index 
  - `calculate_MACD(data, ticker, fast_window=None, slow_window=None, signal_window=None, default_fast_window=12, default_slow_window=26, default_signal_window=9)`: Calculates Moving Average Convergence Divergence
  - `calculate_ATR(data, ticker, window=None, default_window=14)`: Calculates Average True Range
  - `calculate_OBV(data, ticker)`: Calculates On-Balance Volume
  - `calculate_stochastic_oscillator(data, ticker, k_window=None, d_window=None, default_k_window=14, default_d_window=3)`: Calculates Stochastic Oscillator
  - `calculate_ichimoku_cloud(data, ticker, conversion_period=None, base_period=None, lagging_span_b_period=None, default_conversion_period=9, default_base_period=26, default_lagging_span_b_period=52)`: Calculates Ichimoku Cloud components
  - `_extract_indicator_params(indicator_config)`: Helper function to extract indicator name and parameters from different configuration formats
  - `_add_trace_to_panel(fig, trace, panel_idx)`: Helper function to add a trace to the specified panel in the figure
  - `add_indicator_to_chart(fig, data, indicator_config, ticker, panel_idx=1)`: Adds indicator traces to an existing chart, optionally in a specific panel
- **Key Features**:
  - Uses a dispatcher pattern to map indicator names to calculation functions
  - Returns Plotly traces ready to be added to charts
  - Handles both single-trace and multi-trace indicators
  - Supports dynamic window sizing based on available data points
  - Allows custom parameter configuration for all indicators
  - Supports placement of indicators in different panels of a multi-panel chart
  - **Improved modularity with dedicated helper functions for window size calculation, parameter extraction, and trace placement**
  - **Enhanced documentation with more detailed explanatory comments for complex calculations**
  - **Consistent error handling and logging patterns across all functions**
  - **DRY (Don't Repeat Yourself) design by centralizing common functionality in helper functions**

### 11. `app/stock_analysis/stock_data_charting.py`
- **Purpose**: This file handles all chart building and visualization functionality.
- **Location**: `backend/app/stock_analysis/stock_data_charting.py`
- **Key Functions**:
  - `build_candlestick_chart(ticker, data)`: Creates a basic candlestick chart
  - `build_line_chart(ticker, data)`: Creates a line chart using closing prices
  - `apply_rangebreaks(fig, ticker, data, interval, row=1)`: Adds x-axis rangebreaks to remove gaps (after hours, weekends)
  - `add_selected_indicators(fig, data, ticker, indicators)`: Adds selected indicators to a chart
  - `analyze_ticker(ticker, data, indicators, interval, chart_type)`: Orchestrates the chart creation process, now always using the multi-panel approach for consistency
  - `analyze_ticker_single_panel(ticker, data, indicators, interval, chart_type)`: Creates a traditional single-panel chart (maintained for backward compatibility)
  - `analyze_ticker_multi_panel(ticker, data, indicators, interval, chart_type)`: Creates a multi-panel chart with indicators organized logically
  - `main()`: Test function for local development
- **Key Features**:
  - Supports multiple chart types (candlestick and line)
  - Handles x-axis rangebreaks to remove gaps in intraday data
  - Integrates with the indicators module for overlaying technical analysis
  - **Always uses multi-panel visualization for consistent styling and formatting**
  - Applies appropriate styling and configuration to each panel
  - **Includes robust error handling and fallbacks for edge cases**
  - **Enhanced logging for easier debugging of chart generation issues**
  - **Uses global constants for common chart elements to avoid redundant definitions**
  - **Batches rangebreak application to minimize layout recalculations and reduce flickering**
  - **Implements uirevision parameter for consistent state preservation across updates**
  - **Consolidates layout updates to avoid multiple re-renders**
  - **Caches lowercased chart type to avoid repeated function calls**

### 12. `app/stock_analysis/indicator_panels.py`
- **Purpose**: This file provides a system for organizing technical indicators into logical panel groups.
- **Location**: `backend/app/stock_analysis/indicator_panels.py`
- **Key Functions**:
  - `extract_indicator_name(indicator)`: Extracts the name from an indicator object regardless of its type
  - `extract_custom_panel(indicator)`: Extracts custom panel assignment from an indicator object if available
  - `get_indicator_metadata(indicator_name)`: Returns metadata about indicators including their default panel assignment
  - `organize_indicators_into_panels(indicators)`: Groups indicators by their panel assignments
  - `calculate_panel_heights(panels)`: Determines appropriate height ratios for panels
  - `create_panel_config(indicators)`: Creates a complete panel configuration based on selected indicators
  - `get_panel_title(panel_name, ticker)`: Gets an appropriate title for a panel based on its type
  - `configure_panel_axes(fig, panel_name, row_idx)`: Configures the axes for a specific panel type
  - `initialize_multi_panel_figure(panel_config, ticker)`: Creates a Plotly figure with properly configured subplots
- **Key Features**:
  - Categorizes indicators based on their natural visualization properties
  - Supports panel customization through indicator configuration
  - Generates appropriate panel sizes and layouts
  - Adds panel-specific visual elements (reference lines, axis titles)
  - Ensures consistent styling and interaction across panels
  - **Now includes safety measures to always ensure at least one panel (main) exists**
  - **Provides comprehensive error handling for invalid panel configurations**
  - **Fallback mechanisms to prevent subplot errors with empty indicator lists**
  - **Detailed logging of panel creation and configuration process**
  - **Removes dynamic height calculation to let frontend control chart height**
  - **Preserves relative height ratios between panels while allowing frontend to set absolute height**
  - **Improved modularity with dedicated helper functions for name extraction, panel assignment, and axis configuration**
  - **Centralized default metadata through constants for consistent handling of unknown indicators**

### 13. `app/stock_analysis/kpi_manager.py`
- **Purpose**: This file provides a centralized manager for calculating, formatting, and organizing KPIs.
- **Location**: `backend/app/stock_analysis/kpi_manager.py`
- **Key Components**:
  - **`KpiManager` class**: Factory-pattern implementation that orchestrates KPI aggregation and delivery
  - **Constants**: Defines KPI group constants (PRICE, VOLUME, VOLATILITY, FUNDAMENTAL, SENTIMENT)
  - **Caching System**: Implements time-based caching with configurable timeout (default 5 minutes)
- **Key Functions**:
  - `_is_cache_valid(cache_key)`: Checks if cached data is still valid based on timestamp
  - `_get_from_cache(cache_key)`: Retrieves data from cache if available and valid
  - `_store_in_cache(cache_key, data)`: Stores data in cache with current timestamp
  - `_fetch_kpi_group(ticker, group, timeframe)`: Fetches KPIs for a specific group
  - `get_kpis(ticker, kpi_groups, timeframe, use_cache)`: Main method that retrieves requested KPIs
  - `get_kpi_manager()`: Singleton factory function that returns a shared KpiManager instance
- **Key Features**:
  - Provides a unified interface for all KPI calculations
  - Delegates specific calculations to specialized modules in the kpi/ directory
  - Implements caching for frequently accessed data and calculations
  - Supports partial KPI calculation based on requested categories
  - Ensures consistent formatting and structure in KPI responses
  - Centralizes error handling and logging for all KPI operations
  - Uses concurrent.futures for parallel processing of KPI group calculations

### 14. `app/stock_analysis/kpi/`
- **Purpose**: This folder contains specialized modules for different categories of KPI calculations.
- **Location**: `backend/app/stock_analysis/kpi/`
- **Key Components**:
  - **`__init__.py`**: Initializes the KPI package and provides exports for key functions
    - Imports and re-exports all public functions from the specialized metric modules
    - Defines a clean public API through `__all__` list
    - Makes all KPI calculation functions available directly from the package level
  - **`price_metrics.py`**: Calculates price-related metrics with functions such as:
    - `get_current_price()`: Returns the current market price
    - `get_price_changes()`: Calculates price changes over various periods (1d, 5d, 1mo, etc.)
    - `get_day_high_low()`: Returns the day's high and low prices
    - `get_open_price()`: Returns the market open price
    - `get_previous_close()`: Returns the previous day's closing price
    - `get_all_price_metrics()`: Aggregates all price metrics into a single response
  - **`volume_metrics.py`**: Calculates volume-related metrics with functions such as:
    - `get_current_volume()`: Returns the current trading volume
    - `get_average_volume()`: Calculates average volume over a specified period
    - `get_volume_ratio()`: Compares current volume to average volume
    - `get_relative_volume()`: Calculates volume relative to recent averages
    - `get_all_volume_metrics()`: Aggregates all volume metrics into a single response
  - **`volatility_metrics.py`**: Calculates volatility-related metrics with functions such as:
    - `get_52_week_high_low()`: Returns the 52-week high and low prices
    - `get_historical_volatility()`: Calculates historical price volatility
    - `get_beta()`: Calculates the stock's beta against a market index
    - `get_average_true_range()`: Calculates the ATR indicator
    - `get_bollinger_band_width()`: Calculates Bollinger Band width as volatility measure
    - `get_all_volatility_metrics()`: Aggregates all volatility metrics into a single response
  - **`fundamental_metrics.py`**: Calculates fundamental financial metrics with functions such as:
    - `get_market_cap()`: Returns the company's market capitalization
    - `get_pe_ratio()`: Calculates the price-to-earnings ratio
    - `get_eps()`: Returns the earnings per share
    - `get_dividend_yield()`: Calculates the dividend yield percentage
    - `get_debt_to_equity()`: Returns the debt-to-equity ratio
    - `get_roe()`: Calculates return on equity
    - `get_price_to_book()`: Calculates price-to-book ratio
    - `get_price_to_sales()`: Calculates price-to-sales ratio
    - `get_all_fundamental_metrics()`: Aggregates all fundamental metrics into a single response
  - **`sentiment_metrics.py`**: Empty file prepared for future implementation of:
    - Market sentiment indicators
    - Social media sentiment analysis
    - News sentiment impact
  - **`kpi_utils.py`**: Provides shared utilities for KPI calculations:
    - `sanitize_ticker()`: Standardizes ticker symbol format
    - `format_percentage()`: Formats values as percentage strings
    - `format_currency()`: Formats values as currency strings
    - `format_volume()`: Formats volume values with appropriate suffixes (K, M, B)
    - `safe_calculation()`: Decorator for error handling in KPI calculations
    - `fetch_ticker_info()`: Retrieves stock information from Yahoo Finance
    - `fetch_ticker_history()`: Retrieves historical price data
    - `format_kpi_value()`: Standardizes KPI value formatting based on type
    - Various helper functions for data transformation and validation

### 15. `app/stock_analysis/market_hours.py`
- **Purpose**: This file handles tracking market hours for different stock exchanges around the world.
- **Location**: `backend/app/stock_analysis/market_hours.py`
- **Key Class**:
  - `MarketHoursTracker`: Main class for tracking stock market hours
- **Key Methods**:
  - `get_market_hours(ticker, date)`: Gets market open/close hours for a specific date
  - `get_market_status(ticker)`: Gets current market status (open/closed) and time until next state change
  - `get_trading_schedule(ticker, start_date, end_date)`: Gets trading schedule for a date range
- **Key Features**:
  - Handles different exchanges and time zones
  - Uses pandas_market_calendars for accurate market calendar data
  - Provides countdown information for markets opening/closing
  - Handles weekends, holidays, and other non-trading days
  - Implements exchange mapping to determine the correct exchange for a ticker
  - Gracefully handles fallback to default exchange when specific exchange is unavailable

|---------------------|
|     db folder       |
|---------------------|

Nothing to see here yet.

|---------------------|
|     models folder   |
|---------------------|

### 16. `app/models/__init__.py`
- **Purpose**: This file is used to initialize the models package.
- **Location**: `backend/app/models/__init__.py`

### 17. `app/models/report_models.py`
- **Purpose**: This file contains data models related to reports.
- **Location**: `backend/app/models/report_models.py`

### 19. `app/models/structured_report_nodes.py`
- **Purpose**: This file contains node definitions for report generation.
- **Location**: `backend/app/models/structured_report_nodes.py`
- **Key Features**:
  - Implements lazy loading pattern for formatted prompts using `get_formatted_prompts()` function
  - Only fetches LangChain prompts when explicitly needed, preventing unnecessary API calls
  - Provides centralized access to prompts for all report generation nodes

|---------------------|
|    services folder  |
|---------------------|

### 20. `app/services/__init__.py`
- **Purpose**: This file is used to initialize the services package and provides access to core services.
- **Location**: `backend/app/services/__init__.py`
- **Key Features**:
  - Imports and re-exports key service functions like `fetch_prompts()` without triggering immediate execution
  - Uses carefully structured imports to minimize side effects during module loading

### 21. `app/services/financial/__init__.py`
- **Purpose**: This file initializes the financial services package and provides access to key financial data functions.
- **Location**: `backend/app/services/financial/__init__.py`
- **Key Features**:
  - Imports and re-exports key financial service functions
  - Uses carefully structured imports to minimize side effects during module loading

### 22. `app/services/financial/financial_data_fetcher.py`
- **Purpose**: This file provides functions for retrieving financial data from various sources.
- **Location**: `backend/app/services/financial/financial_data_fetcher.py`
- **Key Functions**:
  - `fetch_financial_statements(ticker)`: Retrieves income statement, balance sheet, and cash flow data
  - `fetch_company_profile(ticker)`: Retrieves company information and profile data
  - `fetch_analyst_recommendations(ticker)`: Retrieves analyst ratings and recommendations
  - `fetch_institutional_holdings(ticker)`: Retrieves institutional ownership information
  - `fetch_insider_trades(ticker)`: Retrieves recent insider trading activity
  - `fetch_earnings_data(ticker)`: Retrieves earnings history and upcoming earnings dates
  - `fetch_financial_ratios(ticker)`: Retrieves key financial ratios calculated from statements
- **Key Features**:
  - Integration with multiple data providers for comprehensive coverage
  - Caching to minimize redundant API requests
  - Error handling with appropriate fallbacks
  - Rate limiting to prevent API quota exhaustion
  - Data normalization for consistent format across providers

### 23. `app/services/financial/financial_metrics.py`
- **Purpose**: This file contains functions for calculating financial metrics and key performance indicators.
- **Location**: `backend/app/services/financial/financial_metrics.py`
- **Key Functions**:
  - `calculate_valuation_metrics(ticker_data)`: Calculates PE ratio, PB ratio, PS ratio, etc.
  - `calculate_profitability_metrics(ticker_data)`: Calculates profit margin, ROE, ROA, etc.
  - `calculate_growth_metrics(ticker_data)`: Calculates YOY growth rates for revenue, earnings, etc.
  - `calculate_efficiency_metrics(ticker_data)`: Calculates inventory turnover, asset turnover, etc.
  - `calculate_liquidity_metrics(ticker_data)`: Calculates current ratio, quick ratio, etc.
  - `calculate_debt_metrics(ticker_data)`: Calculates debt-to-equity, interest coverage, etc.
  - `calculate_cash_flow_metrics(ticker_data)`: Calculates free cash flow, cash flow yield, etc.
- **Key Features**:
  - Industry-standard financial metric calculations
  - Comparison with sector and market averages
  - Trend analysis for historical context
  - Clear documentation of calculation methodologies
  - Comprehensive error handling for missing data

|---------------------|
|     utils folder    |
|---------------------|

### 24. `app/utils/__init__.py`
- **Purpose**: This file is used to initialize the utils package.
- **Location**: `backend/app/utils/__init__.py`

### 25. `app/utils/system_checks.py`
- **Purpose**: This file contains utilities for checking system requirements.
- **Location**: `backend/app/utils/system_checks.py`

|---------------------|
|    logs folder      |
|---------------------|

### 26. `logs/app.log`
- **Purpose**: This file contains application logs generated by the logging system. The logs include timestamps, log levels, and structured information about application events and errors.
- **Location**: `backend/logs/app.log`

|---------------------|
|    root folder      |
|---------------------|

### 27. `BACKEND_DOCS.md`
- **Purpose**: This file contains the documentation for the backend.
- **Location**: `backend/BACKEND_DOCS.md`

### 28. `requirements.txt`
- **Purpose**: This file contains the dependencies for the backend.
- **Location**: `backend/requirements.txt`
- **Key Features**:
  - Includes FastAPI, uvicorn, and python-multipart for the web server
  - Contains yfinance for stock data retrieval
  - Includes plotting libraries like matplotlib and plotly

### 29. `run.py`
- **Purpose**: This file is the entry point for the report generation functionality.
- **Location**: `backend/run.py`

### 30. `start_api_server.py`
- **Purpose**: Entry point script for starting the FastAPI stock analysis API server.
- **Location**: `backend/start_api_server.py`
- **Key Features**:

Location:
- **backend/start_api_server.py**

Key Features (Updated):
- Centralized Environment Setup:
  - Loads environment variables from a .env file and adds the project's root to the Python path.
  - (See the sys.path.insert(...) and load_dotenv() calls.)
- Centralized Logging:
  - Imports and uses the centralized logging configuration from app/core/logging_config.py via get_logger().
  - Logs startup events using environment-aware log levels.
  - Uses the pre-configured logger to capture detailed startup logs and errors.
- Environment-Aware Server Configuration:
  - Adjusts settings based on the environment:
    - Development Mode (IS_DEVELOPMENT=True):
      - Enables live-reloading (reload=True).
      - Sets the Uvicorn log level to debug.
    - Production Mode (IS_DEVELOPMENT=False):
      - Disables live-reloading (reload=False).
      - Sets the Uvicorn log level to info.
- Robust Error Handling:
  - The main server startup code is wrapped in a try/except block.
  - On any exception, it logs the full stack trace using logger.exception() and cleanly exits with a non-zero status.
- Flexible Port Configuration:
  - Retrieves the API port from the environment variable (API_PORT), defaulting to 8000 if not provided.

### 31. `.env`
- **Purpose**: This file contains the environment variables for the backend.
- **Location**: `backend/.env`
- **Key Variables**:
  - **API_PORT**: Configures the port for the FastAPI server (defaults to 8000)
  - **ENVIRONMENT**: Controls whether the application runs in development or production mode
  - **IS_DEVELOPMENT**: Boolean flag that enables development-specific features when true
  - **API Keys**:
    - OPENAI_API_KEY: For OpenAI LLM integration
    - ANTHROPIC_API_KEY: For Anthropic Claude integration
    - TAVILY_API_KEY: For web search functionality
  - **Logging Configuration**:
    - LOG_LEVEL: Sets the application-wide logging level
    - LANGCHAIN_TRACING_V2: Controls LangSmith tracing for debugging LLM calls

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
- **Environment Configuration**:
  - Development/Production mode is determined by environment variables in `.env` file
  - Server behavior adapts automatically based on the detected environment
  - Logging is configured via the centralized logging system
- **Server Options**:
  - **Development Mode**: Enables live code reloading and debug-level logging
  - **Production Mode**: Disables reloading and uses info-level logging
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
    "SMA",                  // Simple string format (uses defaults)
    {                       // Object format with custom parameters
      "name": "EMA",
      "window": 50,
      "panel": "main"       // Optional panel assignment
    },
    {
      "name": "RSI",
      "window": 14,
      "panel": "oscillator"
    },
    {
      "name": "MACD",
      "fast_window": 12,
      "slow_window": 26,
      "signal_window": 9,
      "panel": "macd"
    },
    {
      "name": "Bollinger Bands",
      "window": 20,
      "std_dev": 2
    },
    {
      "name": "Stochastic Oscillator",
      "k_window": 14,
      "d_window": 3,
      "panel": "oscillator"
    },
    {
      "name": "Ichimoku Cloud",
      "conversion_period": 9,
      "base_period": 26,
      "lagging_span_b_period": 52
    },
    "VWAP",
    "OBV",
    "ATR"
  ],
  "chart_type": "candlestick" // Chart type: "candlestick" or "line" (optional, default: "candlestick")
}
```

|--------------------------------|
|     Chart Rendering System     |
|--------------------------------|

### 1. Chart Height Control
- **Purpose**: Ensures consistent chart heights for multi-panel Plotly charts.
- **Implementation**:
  - **Frontend-controlled Height**: Chart height is controlled by the frontend component, not the backend
  - **Removed Dynamic Backend Sizing**: The backend no longer sets chart height based on panel count (`height=max(300, 200 * num_panels)`)
  - **Panel Height Ratios**: While backend doesn't set absolute heights, it still maintains relative height ratios between panels
  - **Single Source of Truth**: Chart height is defined as a constant in the frontend, ensuring consistency

### 2. Optimized Layout Updates
- **Purpose**: Minimizes redundant layout recalculations to prevent chart flickering and height inconsistencies.
- **Implementation**:
  - **Batched Rangebreak Application**: Applies all panel rangebreaks in a single batch to reduce layout recalculations
  - **Consolidated Layout Updates**: Uses a single `update_layout` call rather than multiple separate calls
  - **Cached Values**: Uses module-level constants (like `WEEKEND_RANGEBREAK` and `NON_INTRADAY_INTERVALS`) for frequently used values
  - **State Preservation**: Implements `uirevision` parameter to maintain consistent state across updates
  - **Optimized Variable Usage**: Caches lowercased values and other frequently accessed properties

### 3. Improved Error Handling
- **Purpose**: Provides graceful degradation and fallback mechanisms for chart rendering.
- **Implementation**:
  - **Subplot Creation Fallbacks**: Includes fallback to single panel if subplot creation fails
  - **Panel Configuration Safety Checks**: Ensures at least one panel exists, even if no indicators are provided
  - **Detailed Logging**: Adds comprehensive logging to track chart creation process and identify issues
  - **Error Recovery**: Returns empty figures with appropriate logging rather than crashing when errors occur

|--------------------------------|
|      API Endpoints Update      |
|--------------------------------|

### 1. New KPI-related Endpoints
The stock analysis API now includes endpoints for retrieving KPI data:

- **`/api/stocks/kpi/{ticker}`** (GET): Retrieves key performance indicators for a specific ticker
  - **Parameters**:
    - `ticker` (path): Stock ticker symbol
    - `groups` (query, optional): Comma-separated list of KPI groups to include
    - `timeframe` (query, optional): Timeframe for metrics calculation (default: "1y")
  - **Response**:
    ```json
    {
      "ticker": "AAPL",
      "kpi_groups": [
        {
          "title": "Price Metrics",
          "metrics": [
            {
              "label": "Current Price",
              "value": "182.63",
              "trend": 0.015,
              "trend_label": "+1.5% today"
            },
            // More metrics...
          ]
        },
        // More groups...
      ]
    }
    ```

- **`/api/stocks/financials/{ticker}`** (GET): Retrieves fundamental financial data for a specific ticker
  - **Parameters**:
    - `ticker` (path): Stock ticker symbol
    - `type` (query): Type of financial data (income, balance, cash_flow, ratios, all)
    - `period` (query, optional): Period (annual, quarterly, default: annual)
  - **Response**: Financial data in a structured JSON format

### 2. Market Hours Endpoint
- **`/api/stocks/market-hours`** (POST): Retrieves current market hours status for a specific ticker
  - **Request Body**:
    ```json
    {
      "ticker": "AAPL"  // Stock ticker symbol
    }
    ```
  - **Response**:
    ```json
    {
      "ticker": "AAPL",
      "is_market_open": true,  // Whether the market is currently open
      "exchange": "NYSE",      // The exchange where the ticker is traded
      "next_state": "close",   // Next state change (open or close)
      "next_state_change": "2023-06-15T20:00:00Z",  // ISO timestamp of next state change
      "seconds_until_change": 14400,  // Seconds until the next state change
      "current_time": "2023-06-15T16:00:00Z"  // Current time in ISO format
    }
    ```
  - **Error Handling**:
    - Returns 404 if ticker is not found
    - Returns 500 for server-side errors

### 4. Error Handling in API Services
In the development process of market hours functionality, we encountered several error scenarios that required careful handling:

1. **404 API Endpoint Errors**: When first implementing the market hours functionality, we encountered a 404 error because the frontend was not correctly using the established API URL pattern. This was fixed by:
   - Adding a proper API service function for market hours in the stock.js file
   - Using the centralized API_URL configuration instead of hardcoded paths
   - Following the same error handling pattern used in other API functions

2. **Data Validation Errors**: When handling market hours data, we need to validate that:
   - The exchange for a ticker is correctly identified
   - Fallback to a default exchange (NYSE) if unknown
   - Handle cases where the market calendar for an exchange is not available

3. **Time Zone Handling**: Market hours calculation requires careful time zone handling:
   - All times are converted to UTC for consistency
   - Market open/close times need to respect exchange-specific time zones
   - Countdown calculations must account for time zone differences

4. **Edge Cases**:
   - Handling weekends and holidays (non-trading days)
   - Finding the next trading day when markets are closed
   - Handling markets that span midnight (cross-day trading sessions)

These error handling strategies are implemented in both the backend MarketHoursTracker and the API endpoint response formatting.

### Additional Dependencies for Market Hours Tracking

#### 1. pandas_market_calendars
- **Purpose**: Provides accurate exchange calendars for different stock markets around the world.
- **Features**:
  - Contains trading calendars for major exchanges (NYSE, NASDAQ, LSE, etc.)
  - Handles holidays, early closings, and special trading days
  - Provides API for querying market open/close times
  - Manages time zone conversions between exchanges
- **Integration**:
  - Used by the MarketHoursTracker class to determine trading schedules
  - Key dependency for market hours countdown functionality
  - Added to requirements.txt to ensure availability

#### 2. Python Standard Library Dependencies for Market Hours
- **datetime**: Used for date and time handling in market hours calculations
- **pytz**: Used for time zone conversions between different market exchanges
- **typing**: Used for type hints to improve code quality and IDE support