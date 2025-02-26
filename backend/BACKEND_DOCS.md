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
│   │   └── main.py       # FastAPI application and endpoints
│   ├── core/             # Core application components
│   │   ├── __init__.py   # Package initialization
│   │   ├── settings.py   # Application settings and configuration
│   │   └── validate_api_keys.py # API key validation utilities
│   ├── models/           # Data models and schemas
│   │   ├── __init__.py   # Package initialization
│   │   ├── report_models.py # Report-related data models
│   │   └── structured_report_nodes.py # Node definitions for report generation
│   ├── db/               # Database related code
│   ├── services/         # Business logic and external service integrations
│   │   ├── llm/          # Language model related services
│   │   │   ├── __init__.py # Package initialization
│   │   │   ├── llm_handler.py # LLM provider integration
│   │   │   └── fetch_project_prompts.py # Retrieves prompts from LangSmith
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
│   │   │   └── report_graph_builders.py # Graph-based report generation pipelines
│   │   ├── hackernews/   # HackerNews related services
│   │   │   ├── __init__.py # Package initialization
│   │   │   ├── hackernews_tracker.py # HackerNews API integration
│   │   │   └── hackernews_url_analyzer_pipeline.py # Pipeline for analyzing HN URLs
│   │   └── __init__.py   # Package initialization
│   ├── utils/            # Utility functions and helpers
│   │   ├── __init__.py   # Package initialization
│   │   └── system_checks.py # System environment validation
│   └── __init__.py       # Main package initialization
├── tests/                # Test suite
│   ├── __init__.py       # Test package initialization
│   └── test_file.py      # Test cases
|── BACKEND_DOCS.md       # Documentation for the backend
├── requirements.txt      # Python dependencies
├── run.py                # Application entry point
└── test_import.py        # Import testing utility
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

### 1.2 `app/core/`
- **Purpose**: Contains essential application components like configuration management, security utilities, and other foundational elements that the rest of the application depends on. These are the building blocks that support the entire application.
- **Location**: `backend/app/core/`

### 1.3 `app/models/`
- **Purpose**: Contains data structure definitions, type hints, and schemas used throughout the application, particularly for the report generation pipeline. These models define the shape of data as it flows through the application.
- **Location**: `backend/app/models/`

### 1.4 `app/db/`
- **Purpose**: Contains database-related code, including connection management, ORM models, repositories, and migrations. This layer abstracts database interactions from the rest of the application, providing a clean API for data persistence.
- **Location**: `backend/app/db/`

### 1.5 `app/services/`
- **Purpose**: Contains business logic and integrations with external services. This layer implements the core functionality of the application and is organized into subpackages by domain.
- **Location**: `backend/app/services/`

#### 1.5.1 `app/services/llm/`
- **Purpose**: Contains services related to language model interactions. This includes handling different LLM providers, managing prompts, and processing LLM responses.
- **Location**: `backend/app/services/llm/`

#### 1.5.2 `app/services/web/`
- **Purpose**: Contains services for web content extraction and analysis. This includes scraping web pages, extracting relevant content, and analyzing the topics and sentiment of web content.
- **Location**: `backend/app/services/web/`

#### 1.5.3 `app/services/search/`
- **Purpose**: Contains services for performing web searches and processing search results. This includes integrating with search APIs like Tavily and formatting the search results for consumption by other parts of the application.
- **Location**: `backend/app/services/search/`

#### 1.5.4 `app/services/reports/`
- **Purpose**: Contains services for generating structured reports. This includes building report pipelines, orchestrating the report generation process, and formatting the final output.
- **Location**: `backend/app/services/reports/`

#### 1.5.5 `app/services/hackernews/`
- **Purpose**: Contains services specific to HackerNews integration. This includes fetching stories from HackerNews, tracking trends, and analyzing the content of HackerNews URLs.
- **Location**: `backend/app/services/hackernews/`

### 1.6 `app/utils/`
- **Purpose**: Contains utility functions and helpers that support the application but aren't tied to specific business logic. These are general-purpose functions that can be used across different parts of the application.
- **Location**: `backend/app/utils/`

### 2. `tests/`
- **Purpose**: Contains the test suite for the application. This includes unit tests, integration tests, and end-to-end tests to ensure the application works as expected.
- **Location**: `backend/tests/`

|--------------------------------|
|      Potential Future Folders  |
|--------------------------------|

### 1. `app/schemas/`
- **Purpose**: Would contain Pydantic schemas for request/response validation, separate from the data models. This separation allows for different validation rules for API inputs/outputs versus internal data structures.
- **Key Components**:
  - `schemas/requests/`: Input validation schemas for API endpoints
  - `schemas/responses/`: Output formatting schemas for API responses
  - `schemas/common.py`: Shared schema components and base models
- **When to Add**: Add this folder when your API layer grows and you need more sophisticated request/response validation, especially if the validation logic differs from your internal data models.

### 2. `app/middleware/`
- **Purpose**: Would contain HTTP middleware components for cross-cutting concerns like authentication, logging, error handling, and request/response transformation. Middleware intercepts HTTP requests/responses before they reach your route handlers.
- **Key Components**:
  - `middleware/auth.py`: Authentication and authorization middleware
  - `middleware/logging.py`: Request/response logging
  - `middleware/error_handlers.py`: Global exception handlers
  - `middleware/cors.py`: Cross-Origin Resource Sharing configuration
- **When to Add**: Add this folder when you need to apply consistent processing across multiple API endpoints, such as enforcing authentication, logging requests, or handling errors in a standardized way.

### 3. `app/background/`
- **Purpose**: Would contain code for background tasks and scheduled jobs. This includes long-running processes, periodic tasks, and asynchronous job processing.
- **Key Components**:
  - `background/tasks.py`: Background task definitions
  - `background/scheduler.py`: Task scheduling logic
  - `background/workers.py`: Worker process management
- **When to Add**: Add this folder when you need to perform operations asynchronously or on a schedule, such as data refreshing, report generation, or notification sending.

|--------------------------------|
|        File Explanation        |
|--------------------------------|

|---------------------|
|     api folder      |
|---------------------|

### 1. `app/api/__init__.py`
- **Purpose**: This file is used to initialize the API package.
- **Location**: `backend/app/api/__init__.py`

### 2. `app/api/main.py`
- **Purpose**: This file is the main file for the API.
- **Location**: `backend/app/api/main.py`

|---------------------|
|     core folder     |
|---------------------|

### 3. `app/core/__init__.py`
- **Purpose**: This file is used to initialize the core package.
- **Location**: `backend/app/core/__init__.py`

### 4. `app/core/settings.py`
- **Purpose**: This file contains application settings and configuration management.
- **Location**: `backend/app/core/settings.py`

### 5. `app/core/validate_api_keys.py`
- **Purpose**: This file contains utilities for validating API keys.
- **Location**: `backend/app/core/validate_api_keys.py`

|---------------------|
|     db folder       |
|---------------------|

Nothing to see here yet.

|---------------------|
|     models folder   |
|---------------------|

### 8. `app/models/__init__.py`
- **Purpose**: This file is used to initialize the models package.
- **Location**: `backend/app/models/__init__.py`

### 9. `app/models/report_models.py`
- **Purpose**: This file contains data models related to reports.
- **Location**: `backend/app/models/report_models.py`

### 10. `app/models/structured_report_nodes.py`
- **Purpose**: This file contains node definitions for report generation.
- **Location**: `backend/app/models/structured_report_nodes.py`

|---------------------|
|    services folder  |
|---------------------|

### 11. `app/services/__init__.py`
- **Purpose**: This file is used to initialize the services package.
- **Location**: `backend/app/services/__init__.py`

|---------------------|
|     utils folder    |
|---------------------|

### 12. `app/utils/__init__.py`
- **Purpose**: This file is used to initialize the utils package.
- **Location**: `backend/app/utils/__init__.py`

### 13. `app/utils/system_checks.py`
- **Purpose**: This file contains utilities for checking system requirements.
- **Location**: `backend/app/utils/system_checks.py`

|---------------------|
|    root folder      |
|---------------------|

### 14. `BACKEND_DOCS.md`
- **Purpose**: This file contains the documentation for the backend.
- **Location**: `backend/BACKEND_DOCS.md`

### 15. `requirements.txt`
- **Purpose**: This file contains the dependencies for the backend.
- **Location**: `backend/requirements.txt`

### 16. `run.py`
- **Purpose**: This file is the entry point for the backend.
- **Location**: `backend/run.py`

### 17. `test_import.py`
- **Purpose**: This file is used to test the imports of the backend.
- **Location**: `backend/test_import.py`

### 18. `.env`
- **Purpose**: This file contains the environment variables for the backend.
- **Location**: `backend/.env`
