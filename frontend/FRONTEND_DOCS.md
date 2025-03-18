# Frontend Documentation

## Frontend Project Structure
```
frontend/
├── .next/                # Next.js build output directory
├── node_modules/         # Dependencies installed by npm
├── public/               # Static files that will be served directly
│   └── assets/           # Static assets like images, fonts, etc.
│   └── project_image.png # Project image
├── src/                  # Source code of the application
│   ├── components/       # Reusable React components
│   │   ├── common/       # Shared/common components
│   │   ├── layout/       # Layout-related components
│   │   │   ├── Header.js # Fixed header component with project logo
│   │   │   ├── Sidebar.js # Toggleable sidebar navigation component
│   │   │   └── Layout.js # Layout wrapper for consistent UI structure
│   │   ├── stock/        # Stock analysis-specific components
│   │   │   ├── StockChart.js           # Main container for stock chart functionality
│   │   │   ├── ChartDisplay.js         # Component for rendering Plotly charts
│   │   │   ├── ErrorMessage.js         # Component for displaying error messages
│   │   │   ├── LoadingOverlay.js       # Component for displaying loading states
│   │   │   ├── KpiContainer.js         # Container for KPI dashboard 
│   │   │   ├── StockSettingsSidebar.js # Component for stock settings sidebar with all chart controls and indicator configuration
│   │   │   ├── MarketHoursWidget.js    # Market hours and countdown component
│   │   │   └── kpi/                    # KPI (Key Performance Indicators) components
│   │   │       ├── index.js            # Exports all KPI components for easy importing
│   │   │       ├── KpiCard.js          # Individual KPI card component
│   │   │       ├── KpiDashboard.js     # Dashboard for multiple KPI groups
│   │   │       ├── KpiGroup.js         # Grouping component for related KPIs
│   │   │       ├── KpiSettings.js      # Settings component for KPI customization
│   │   │       └── KpiTooltip.js       # Tooltip component for displaying detailed KPI information
│   │   └── reports/      # Report-specific components
│   ├── pages/            # Next.js pages (each file becomes a route)
│   │   ├── api/          # API routes for backend communication
│   │   ├── reports/      # Report-related pages
│   │   ├── stocks/       # Stock analysis pages
│   │   │   └── index.js  # Main stock analysis page
│   │   ├── _app.js       # Custom App component
│   │   └── index.js      # Homepage
│   ├── services/         # Service layer for external API communication
│   │   └── api/          # API service functions
│   │       ├── stock.js  # Stock analysis API service
│   │       └── kpi.js    # KPI data retrieval API service
│   ├── styles/           # CSS and styling files
│   │   └── globals.css   # Global styles
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions and helpers
│       └── logger.js     # Centralized logging utility for the frontend
├── logs/                 # Log files directory
├── FRONTEND_DOCS.md      # Frontend documentation
├── next.config.js        # Next.js configuration
├── package.json          # Project dependencies and scripts
└── package-lock.json     # Exact dependency tree
```

## Key Files Explained

### 1. `package.json`
- **Purpose**: This file is crucial for managing the project's dependencies and defining scripts that automate various tasks within the development workflow. It serves as the manifest for the project, detailing the libraries and tools required for the application to function correctly.
- **Location**: `frontend/package.json`
- **Key Contents**:
  - **Dependencies**: Lists the essential libraries used in the project, including:
    - `next`: The framework for building server-rendered React applications.
    - `react`: The core library for building user interfaces.
    - `react-dom`: Provides DOM-specific methods that can be used at the top level of a web app.
    - `plotly.js`: Powerful visualization library for interactive charts.
    - `react-plotly.js`: React wrapper for Plotly.js charts.
  - **Scripts**: Defines commands that can be run using npm, including:
    - `dev`: Starts the development server, allowing for real-time updates and hot reloading during development.
    - `build`: Compiles the application into an optimized production build, preparing it for deployment.
    - `start`: Launches the production server to serve the built application.
    - `lint`: Runs a linter to analyze the code for potential errors and enforce coding standards.

### 2. `next.config.js`
- **Purpose**: This is the configuration powerhouse of your Next.js application, allowing you to customize various aspects of the framework's behavior.
- **Location**: `frontend/next.config.js`
- **Key Settings**:
  - `reactStrictMode`: Enables React's Strict Mode for identifying potential problems in the application
  - `pageExtensions`: Defines which file extensions should be treated as pages
  - `env`: Configure environment variables
  - `webpack`: Customize the webpack configuration
  - `images`: Configure image optimization features
- **Advanced Features**:
  - Redirects and rewrites configuration
  - API middleware setup
  - Custom headers configuration
  - Internationalization settings

### 3. Pages Directory (`src/pages/`)
- **Purpose**: This directory is the heart of Next.js routing system, where each file automatically becomes a route in your application.
- **Location**: `frontend/src/pages/`
- **Key Files**:
  - `_app.js`: 
    - The custom App component that wraps all pages
    - Perfect place for global styles, layouts, and state management
    - Handles page initialization and global error boundaries
    - Integrates the Layout component for consistent UI across all pages
    - **Logging Implementation**: 
      - Tracks application initialization
      - Logs page navigation events (start, complete, error)
      - Implements error boundary logging for component rendering
  - `index.js`: 
    - The homepage of your application
    - First page users see when visiting your site
    - Contains welcome message and navigation cards
    - Uses dark-themed styling with Shadow Black background
    - **Logging Implementation**:
      - Logs component lifecycle events (mount, unmount)
      - Tracks when the component is fully rendered
      - Logs user interactions with feature cards
    - **Code Organization**:
      - Follows DRY principle with extracted constants for styling (headerFontColor, textColor, etc.)
      - Uses a THEME object to centralize and maintain consistent styling values
      - Implements JSDoc documentation for component and functions
      - Uses template literals with constants for consistent logging messages
  - `stocks/index.js`: 
    - The stock analysis page that hosts the StockChart component
    - Performs health check against the backend API
    - Shows connection status indicator for the stock analysis service
    - Provides intuitive error messaging and retry functionality
    - **Implementation Details**:
      - Dynamically imports the StockChart component with SSR disabled
      - Uses React hooks for API health checks and state management
      - Implements graceful degradation when the backend is unavailable
      - Features consistent styling with the application theme
      - **Modular Structure**:
        - Extracts UI components into separate rendering functions
        - Uses centralized color and message constants for consistency
        - Implements clean error handling with explicit status updates
      - **Component Instance Tracking**:
        - Uses unique instance IDs to trace component lifecycle events
        - Captures detailed health check outcomes in logs
        - Maintains consistent ID references in log messages
  - `_document.js` (optional):
    - Customizes the HTML document structure
    - Useful for adding custom fonts, meta tags, or scripts
- **Special Directories**:
  - `api/`: Contains serverless API routes
  - `reports/`: Groups all report-related pages
  - `stocks/`: Contains stock analysis-related pages

### 4. Components Directory (`src/components/`)
- **Purpose**: Houses reusable React components for maintaining consistent UI patterns
- **Location**: `frontend/src/components/`
- **Key Subdirectories**:
  - `layout/`: Contains components related to the global layout structure
    - `Header.js`:
      - **Purpose**: Provides a fixed header at the top of all pages
      - **Features**:
        - Rich Black (#010203) background with white text
        - Fixed positioning so it stays visible when scrolling
        - Displays project name with link to homepage
        - Shows project logo image at the extreme left edge, followed by company name
        - Includes comprehensive logging of user interactions
        - Uses constants for styling and configuration (HEADER_HEIGHT, HEADER_BG_COLOR, etc.)
        - Implements clear JSDoc documentation for component functions
      - **Code Organization**:
        - Follows DRY principle with extracted constants for repeated values
        - Well-structured component with clear separation of concerns
        - Enhanced inline documentation for better code maintainability
      - **Styling**: Uses Styled JSX for component-scoped styles with constants for consistent theming
    - `Layout.js`:
      - **Purpose**: Wraps all pages with a consistent layout structure
      - **Features**:
        - Incorporates the Header component
        - Integrates the toggleable Sidebar component
        - Manages the sidebar open/closed state
        - Sets Shadow Black (#1B1610) as the app background color
        - Provides proper spacing to prevent content from being hidden by the fixed header
        - Adjusts main content area when sidebar is open
        - Includes global styling for text and links to ensure readability on dark background
      - **Integration**: Automatically used in `_app.js` to wrap all pages
      - **Code Organization**:
        - Follows DRY principle with extracted constants for styling (SHADOW_BLACK, LIGHT_TEXT_COLOR, etc.)
        - Well-structured component with JSDoc documentation for props
        - Uses React's useEffect for proper lifecycle logging
        - Organized CSS with clear comments for each styling section
    - `Sidebar.js`:
      - **Purpose**: Provides a toggleable navigation sidebar
      - **Features**:
        - Dark blue (#0d1b2a) background for a sophisticated look
        - Toggle functionality with smooth animation
        - Close button in the upper right corner of the sidebar
        - Open button positioned just below the header when sidebar is closed
        - Navigation menu with links to key application pages including Stock Analysis
        - Comprehensive logging of sidebar interactions
      - **Styling**: Uses Styled JSX for component-scoped styles with consistent dark theme
      - **Code Organization**:
        - Follows DRY principle with extracted constants for styling (SIDEBAR_WIDTH, HEADER_HEIGHT, SIDEBAR_BACKGROUND, etc.)
        - Well-structured component with clear separation of concerns
        - Improved maintainability through consistent variable naming and documentation
        - Organized CSS with reusable transition properties
  - `stock/`: Contains components for stock market analysis
    - `StockChart.js`:
      - **Purpose**: Main container component that orchestrates the entire stock chart functionality
      - **Location**: `frontend/src/components/stock/StockChart.js`
      - **Key Responsibilities**:
        - Manages overall state for the stock chart feature
        - Handles API communication for fetching stock data
        - Coordinates state updates between child components
        - Manages loading and error states
        - Processes user inputs and updates chart configuration
      - **State Management**:
        - Uses React hooks for local state management
        - Maintains chart configuration in component state
        - Tracks indicator panel assignments and configurations
        - Manages loading and error states
        - Maintains reference to previous chart data for smooth transitions
      - **Props**: None (top-level component)
      - **Child Components**:
        - StockSettingsSidebar
        - ChartDisplay
        - ErrorMessage
        - KpiContainer
    - `StockSettingsSidebar.js`:
      - **Purpose**: Provides a toggleable sidebar for configuring all chart settings and technical indicators
      - **Location**: `frontend/src/components/stock/StockSettingsSidebar.js`
      - **Key Features**:
        - Toggleable sidebar for adjusting chart settings without leaving the main view
        - Input for ticker symbol entry
        - Form inputs for days of history, interval, and chart type
        - Categorized technical indicator selection organized by panel type
        - Parameter configuration for selected indicators
        - Panel assignment controls to determine where each indicator appears
        - Responsive design that works well on various screen sizes
        - Consistent input handling through reusable rendering functions
        - **Custom SVG-Based Checkbox System**:
          - Sophisticated SVG rendering with dynamic fill, stroke, and path modifications
          - Interactive state changes with visual feedback for selection states
          - Complete control over checkbox appearance using styling constants
          - Proper alignment between checkboxes and labels using table-based layout
        - **Advanced Panel-Based Organization System**:
          - Indicators organized into logical panel groups (main, oscillator, macd, volume, volatility)
          - Automatic filtering and categorization of indicators by panel type
          - Consistent styling and interaction patterns across all panel groups
          - Visual differentiation between selected and unselected indicators
        - **Constants-Based Styling Architecture**:
          - Comprehensive styling system with organized constant categories
          - Constants for layout, colors, sidebar, sections, inputs, effects, and checkboxes
          - Centralized styling values for easy theme adjustment and maintenance
          - Reusable styling patterns across the entire component
      - **Props**:
        ```typescript
        interface StockSettingsSidebarProps {
          isOpen: boolean;             // Whether the sidebar is open
          toggleSidebar: () => void;   // Function to toggle sidebar state
          config: object;              // Current chart configuration
          onInputChange: (e) => void;  // Handler for input changes
          onIndicatorChange: (e) => void; // Handler for indicator selection
          onSubmit: (e) => void;       // Handler for form submission
          isLoading: boolean;          // Whether a chart update is in progress
          indicatorConfigs: object;    // Configuration for each indicator
          panelAssignments: object;    // Panel assignments for indicators
          onParamChange: (name, param, value) => void; // Handler for parameter changes
          onPanelChange: (name, panel) => void; // Handler for panel assignment changes
        }
        ```
      - **Implementation Details**:
        - **Modular Design**: 
          - Breaks down UI rendering into helper functions for better maintainability
          - Implements `renderFormGroup`, `renderIndicatorGroup`, and `renderParameterConfig` helper functions
          - Consistently applies the same rendering approach for all form inputs including ticker symbol
          - Extracts utility functions like `isIndicatorConfigured` and `getIndicatorName` to improve readability
        - **Advanced Rendering Function Pattern**:
          - Systematic pattern of reusable rendering functions for different UI sections
          - Consistent event handling and state management across all rendered elements
          - Proper logging of user interactions throughout the component
          - Clean separation between rendering logic and event handling
        - **Table-Based Layout System**:
          - Uses HTML table structure to ensure proper alignment of elements
          - Handles complex vertical alignment challenges for checkboxes and labels
          - Maintains consistent spacing and positioning regardless of content length
          - Provides reliable rendering across different browsers and screen sizes
        - **Styling Constants**:
          - Defines a comprehensive set of styling constants at the top of the file
          - Uses constants for consistent styling across the component
          - Implements variables for sizes, colors, and spacing for easy theming
        - **Comprehensive JSDoc Documentation**:
          - Detailed component description with proper JSDoc format
          - Full documentation of all parameters, props, and helper functions
          - Clear explanations of function purposes and return values
        - **Event Handling**:
          - Proper event handlers with appropriate debugging logs
          - Consistent naming conventions for all handler functions
          - Clear separation of event handlers and rendering logic
        - **Clean, Maintainable Code**:
          - Well-organized structure with logical grouping of related functions
          - Follows DRY principles throughout the component
          - Uses consistent naming conventions and formatting
    - `ChartDisplay.js`:
      - **Purpose**: Component for rendering the Plotly chart
      - **Location**: `frontend/src/components/stock/ChartDisplay.js`
      - **Key Features**:
        - Renders the Plotly chart with the provided data
        - Handles loading states
        - Shows previous chart while loading new data
        - Responsive design that adjusts to container size
        - Implements full-screen viewing mode
        - Ensures consistent fixed chart height of 600px
        - Provides an update button for refreshing chart data
      - **Props**:
        ```typescript
        interface ChartDisplayProps {
          chartData: string;           // JSON string of Plotly chart data
          isLoading: boolean;          // Loading state
          prevChartData: string;       // Previous chart data for smooth transitions
          onUpdate: () => void;        // Function to call for chart updates
        }
        ```
      - **Optimization Features**:
        - **Constants for Dimensions**: Defines `CHART_HEIGHT` and `CHART_WIDTH` as module-level constants to ensure consistent chart sizing
        - **Extracted Helper Functions**: Centralized `processChartData` function to handle JSON parsing and layout normalization in one place
        - **Extracted Event Handlers**: Separate named `handleRelayout` function improves code modularity and maintainability
        - **Local Variable Optimization**: Uses `hasChartData`, `processedChartData`, and `fixedChartHeight` to minimize repetitive operations
        - **Chart Processing**: Pre-processes chart data only once to ensure proper layout configuration and improve performance
        - **Direct DOM Manipulation**: Accesses the Plotly DOM element directly via ref for efficient resize operations
        - **Debounced Resize Handler**: Implements a 250ms debounce on window resize events to prevent excessive rendering
        - **Plotly.Plots.resize Method**: Uses the native Plotly resize method instead of the React wrapper's resizeHandler
        - **Mounted State Tracking**: Maintains a reference to mounted state to prevent operations on unmounted components
        - **Layout Preservation**: Preserves layout during manual user zoom operations to ensure consistent display
        - **Cleanup on Unmount**: Properly removes event listeners and clears timeouts when the component unmounts
        - **Clear JSDoc Documentation**: Component and utility functions have clear JSDoc comments explaining their purpose
    - `ErrorMessage.js`:
      - **Purpose**: Reusable component for displaying error messages in a consistent style
      - **Location**: `frontend/src/components/stock/ErrorMessage.js`
      - **Key Features**:
        - Displays error messages in a consistent style
        - Only renders when a message is provided
        - Special handling for ticker-related errors with additional suggestions
        - Customized styling based on error type
        - Red left border for clear error indication
        - Consistent color scheme using extracted constants
      - **Props**:
        ```typescript
        interface ErrorMessageProps {
          message: string;  // Error message to display
        }
        ```
      - **Implementation Details**:
        - Detects ticker-related errors using string pattern matching
        - Conditionally renders helpful suggestions for ticker errors
        - Uses styled-jsx for component-scoped styles
        - Follows DRY principles with extracted CSS constants
    - `LoadingOverlay.js`:
      - **Purpose**: Reusable component for displaying loading states
      - **Location**: `frontend/src/components/stock/LoadingOverlay.js`
      - **Key Features**:
        - Displays a loading overlay with customizable message
        - Can wrap any content
        - Only displays when loading state is active
        - Uses extracted styling constants for consistent theming
        - Comprehensive JSDoc documentation with detailed descriptions
        - Clear, readable CSS with explanatory comments
      - **Props**:
        ```typescript
        interface LoadingOverlayProps {
          isLoading: boolean;          // Whether to show the loading overlay
          children: React.ReactNode;   // Child components to render under the overlay
          message?: string;            // Optional custom loading message
        }
        ```
      - **Implementation Details**:
        - Uses a relative container with an absolutely positioned overlay
        - Leverages styled-jsx for component-scoped styling
        - Follows DRY principles with extracted styling constants
        - Maintains clean, organized code with proper documentation
    - `kpi/`: Contains components for Key Performance Indicators (KPIs)
      - `index.js`:
        - **Purpose**: Exports all KPI components for easier imports
        - **Location**: `frontend/src/components/stock/kpi/index.js`
        - **Features**:
          - Named exports for individual components
          - Default export for importing all components at once
          - Clear documentation for import usage patterns
      - `KpiCard.js`:
        - **Purpose**: Displays an individual KPI metric in card format
        - **Location**: `frontend/src/components/stock/kpi/KpiCard.js`
        - **Key Features**:
          - Renders a single KPI with label, value, and trend indicators
          - Color-codes values based on positive/negative trends
          - Manages tooltip visibility for detailed information
          - Renders appropriate loading skeleton state
          - Integrates with KpiTooltip for detailed explanations
          - Implements optimized tooltip positioning
        - **Props**:
          ```typescript
          interface KpiCardProps {
            kpi: object;                // KPI data with name, value, and trend
            isLoading?: boolean;        // Whether the card is in loading state
            onClick?: (kpi) => void;    // Optional click handler
            initialTooltipVisible?: boolean; // Whether tooltip starts visible
          }
          ```
        - **Styling Logic**:
          - Uses value trend to determine appropriate color coding
          - Applies hover effects for better interactivity
          - Maintains consistent card dimensions for grid alignment
          - Supports skeleton loading animations
      - `KpiGroup.js`:
        - **Purpose**: Collapsible container for displaying a group of related KPIs
        - **Location**: `frontend/src/components/stock/kpi/KpiGroup.js`
        - **Key Features**:
          - Creates an expandable/collapsible section for a category of KPIs
          - Renders a header with group title and toggle control
          - Manages grid layout for multiple KPI cards
          - Handles loading states with placeholder cards
          - Supports default expanded/collapsed state
          - Forwards KPI click events to parent components
        - **Props**:
          ```typescript
          interface KpiGroupProps {
            group: object;              // KPI group data with title and metrics
            isLoading?: boolean;        // Whether the group data is loading
            onKpiClick?: (kpi) => void; // Optional handler for KPI clicks
            activeKpi?: string;         // Currently active KPI (for tooltips)
            initiallyExpanded?: boolean; // Whether group starts expanded
          }
          ```
        - **Behavior**:
          - Toggles visibility of contained KPI cards when header is clicked
          - Renders loading skeleton cards during data fetch
          - Gracefully handles empty groups
      - `KpiDashboard.js`:
        - **Purpose**: Main container component for organizing and displaying all KPI groups
        - **Location**: `frontend/src/components/stock/kpi/KpiDashboard.js`
        - **Key Features**:
          - Manages layout and organization of multiple KPI groups
          - Handles empty states and error conditions with appropriate UI
          - Supports filtering of visible KPI groups based on user preferences
          - Provides refresh functionality with visual feedback
          - Coordinates KPI interaction with parent components
          - Maintains state of active/selected KPIs for tooltip display
        - **Props**:
          ```typescript
          interface KpiDashboardProps {
            kpiData: object;            // Complete KPI data object from API
            isLoading?: boolean;        // Whether data is currently loading
            onRefresh?: () => void;     // Function to call when refresh is requested
            onKpiClick?: (kpi) => void; // Optional click handler for KPI cards
            viewPreferences?: object;   // Object containing view preferences
          }
          ```
        - **Display Logic**:
          - Renders KPI groups based on visibility settings in viewPreferences
          - Shows appropriate loading, error, or empty states
          - Supports interactive selection of individual KPIs
          - Maintains consistent styling across all KPI elements
      - `KpiSettings.js`:
        - **Purpose**: Modal component for managing KPI display preferences
        - **Location**: `frontend/src/components/stock/kpi/KpiSettings.js`
        - **Key Features**:
          - Provides a modal interface for customizing KPI display options
          - Offers predefined views (Technical, Fundamental, Sentiment, All)
          - Allows individual toggling of KPI groups
          - Maintains preferences with modal state persistence
          - Implements save and cancel functionality for preference changes
          - Supports direct selection of specific groups or predefined views
        - **Props**:
          ```typescript
          interface KpiSettingsProps {
            isVisible: boolean;         // Whether the settings modal is visible
            onClose: () => void;        // Function to call when modal is closed
            availableGroups: string[];  // Available KPI groups from the API
            preferences: object;        // Current preferences object
            onPreferencesChange: (preferences: object) => void; // Called when preferences change
          }
          ```
        - **Preference Structure**:
          - visibleGroups: Array of group IDs that should be displayed
          - expandedGroups: Array of group IDs that should be expanded
          - activeView: Current view selection (technical, fundamental, sentiment, all)
      - `KpiTooltip.js`:
        - **Purpose**: Provides detailed explanations and contextual information for KPI metrics
        - **Location**: `frontend/src/components/stock/kpi/KpiTooltip.js`
        - **Key Features**:
          - Creates rich, interactive tooltips with detailed KPI explanations
          - Dynamically positions tooltips relative to their anchor elements
          - Implements intelligent positioning to ensure tooltip stays in viewport
          - Customizes content based on KPI category (price, volume, volatility, etc.)
          - Handles keyboard navigation with Escape key support
          - Implements click-outside detection for dismissing tooltips
        - **Props**:
          ```typescript
          interface KpiTooltipProps {
            kpi: object;                // KPI data object with detailed information
            anchorEl: HTMLElement;      // Element to anchor the tooltip to
            open: boolean;              // Whether the tooltip is currently visible
            onClose: () => void;        // Callback for closing the tooltip
            position?: string;          // Preferred position (above, below, left, right)
            className?: string;         // Additional CSS class names
          }
          ```
        - **Position Handling**:
          - Calculates optimal position based on available screen space
          - Supports four positioning options: above, below, left, right
          - Adjusts positioning when the tooltip would overflow viewport
          - Adds appropriate arrow indicators based on final position
    - `KpiContainer.js`:
      - **Purpose**: Container component that integrates the KPI dashboard into the stock analysis page
      - **Location**: `frontend/src/components/stock/KpiContainer.js`
      - **Key Features**:
        - Serves as the main integration point for KPI functionality
        - Manages fetching and caching of KPI data with error handling
        - Maintains user preferences with localStorage persistence
        - Provides controls for showing/hiding KPI dashboard
        - Coordinates data sharing between stock chart and KPI components
        - Implements API health checking with graceful degradation
      - **Props**:
        ```typescript
        interface KpiContainerProps {
          ticker: string;                      // Current stock ticker
          onTickerChange: (ticker: string) => void; // Callback for ticker changes
          forceUpdate?: boolean;               // Optional flag to force a data update
        }
        ```
      - **State Management**:
        - Tracks KPI data loading states with isLoading and error flags
        - Manages user preferences for visible and expanded KPI groups
        - Maintains API availability state with fallback UI
        - Implements visibility toggling for both dashboard and settings
  - `common/`: Shared components used across multiple features
  - `reports/`: Components specific to the financial reporting functionality

### 5. Services Directory (`src/services/`)
- **Purpose**: Contains service modules that handle external API communication and business logic
- **Location**: `frontend/src/services/`
- **Key Components**:
  - `api/stock.js`:
    - **Purpose**: Provides functions for interacting with the stock analysis backend API
    - **Key Functions**:
      - `fetchStockChart(config)`: Fetches stock data and returns a chart visualization
      - `checkApiHealth()`: Checks if the API is available
      - `formatIndicator(ind)`: Helper function to format indicator configurations
      - `processErrorResponse(response, ticker, requestId)`: Helper function for standardized error handling
    - **Features**:
      - Robust error handling with informative error messages
      - Typed function parameters and return values
      - Integration with the logging system
      - Configurable API URL for different environments
      - Consistent request tracking with unique ID generation
      - Modular design with extracted helper functions
  - `api/kpi.js`:
    - **Purpose**: Provides functions for retrieving and processing KPI data from the backend API
    - **Key Functions**:
      - `fetchStockKpis(ticker, kpiGroups, timeframe, useCache)`: Fetches KPI data for a specific ticker with optional group filtering and timeframe settings
      - `checkKpiApiHealth()`: Verifies if the KPI API endpoint is available
      - `processErrorResponse(response, ticker, requestId)`: Internal helper for standardized error handling
    - **Features**:
      - Implements retry logic for failed API requests with exponential backoff
      - Supports request timeout handling with AbortController
      - Detailed logging with unique request IDs for traceability
      - User-friendly error messages based on HTTP status codes
      - Request caching control with the useCache parameter
      - Consistent API communication pattern matching other services

### 6. Styles Directory (`src/styles/`)
- **Purpose**: Central location for managing the application's styling system
- **Location**: `frontend/src/styles/`
- **Key Files**:
  - `globals.css`:
    - Contains application-wide styles
    - Defines CSS variables for theming
    - Sets up responsive breakpoints
    - Implements CSS reset and base styles
- **Features**:
  - Modular CSS architecture
  - Theme customization support
  - Responsive design utilities
  - Dark theme implementation with Shadow Black background
  - CSS custom properties for consistent styling

### 7. Utils Directory (`src/utils/`)
- **Purpose**: Houses utility functions and helpers that are used across the application
- **Location**: `frontend/src/utils/`
- **Key Files**:
  - `logger.js`:
    - **Purpose**: Provides centralized, environment-aware logging functionality
    - **Features**:
      - Environment-aware log levels (debug in development, warn in production)
      - Standardized logging methods (debug, info, warn, error)
      - Consistent formatting across the application
      - DRY implementation with utility functions to create loggers for different levels
      - Constants for environment names and log level configuration
      - Modern ES Modules export syntax for better compatibility with Next.js
    - **Usage**: Imported in components using ES Module syntax: `import { logger } from '../utils/logger'`
    - **Benefits**:
      - Simplified debugging process
      - Reduced console noise in production
      - Foundation for future logging enhancements
      - Better code maintainability through modular design
      - Consistent import pattern across the application
    - **Recent Improvements**:
      - **Prevention of duplicate log entries in event handlers**
      - **More descriptive log messages for state changes**
      - **Proper batching of operations that generate logs**
      - **Enhanced documentation with JSDoc comments**

## Logger Implementation Changes

### From CommonJS to ES Modules

One of the critical issues that was fixed in the application was the inconsistency in how the logger was exported and imported, which caused Next.js to fail during rendering.

#### The Problem

- **Mixed Module Systems**: The logger was previously using CommonJS exports (`module.exports = logger`) while the application was using ES Modules imports (`import { logger } from '../../utils/logger'`).
- **Next.js Requirements**: Next.js treats files with ES Module imports as ES Modules exclusively, which can't also contain CommonJS exports.
- **Runtime Errors**: This conflict resulted in errors where components couldn't access logger methods because the imports were mismatched with the exports.

#### The Solution

1. **Standardized on ES Modules**: 
   - Removed CommonJS exports (`module.exports = logger`) from `logger.js`
   - Used only ES Modules exports: `export const logger` and `export default`
   - Updated all imports to use the ES Modules syntax: `import { logger } from '../../utils/logger'`

2. **File Updates**:
   - Modified all components and utilities that were importing the logger
   - Ensured consistent import patterns throughout the codebase
   - Added additional safety checks around logger calls

3. **Benefits of the Change**:
   - **Compatibility**: Better alignment with Next.js expectations for module systems
   - **Consistency**: Single pattern for imports across the entire application
   - **Future-Proofing**: ES Modules are the modern JavaScript standard
   - **Error Reduction**: Eliminated runtime errors caused by module system mismatches

#### Example Changes

Before:
```javascript
// In logger.js
const logger = { /* logger implementation */ };
module.exports = logger;

// In a component
const logger = require('../../utils/logger');
```

After:
```javascript
// In logger.js
export const logger = { /* logger implementation */ };
export default logger;

// In a component
import { logger } from '../../utils/logger';
```

This change highlights the importance of maintaining consistency in module systems, especially in modern JavaScript frameworks like Next.js that have specific expectations about how modules interact.

## Chart Rendering System Optimizations

The chart rendering system has been optimized to address several issues related to chart flickering, inconsistent heights, and performance issues. Key optimizations include:

### 1. Fixed Chart Height Implementation
- **Purpose**: Ensures consistent chart height across all chart displays and during updates
- **Location**: `frontend/src/components/stock/ChartDisplay.js`
- **Key Features**:
  - **Constants for Dimensions**: Defines `CHART_HEIGHT` and `CHART_WIDTH` at the module level as a single source of truth
  - **Style Enforcement**: Applies fixed height of 600px to all chart instances
  - **Layout Processing**: Pre-processes chart data to ensure consistent height settings

### 2. Debounced Resize Handling
- **Purpose**: Prevents excessive re-renders during window resize events
- **Implementation**:
  - **Timeout Management**: Uses `setTimeout` and `clearTimeout` for debouncing with a 250ms delay
  - **Ref for DOM Element**: Maintains a reference to the Plotly DOM element via `plotDivRef`
  - **Direct Plotly Resize**: Uses `Plotly.Plots.resize(plotDivRef.current)` to force Plotly to recalculate layout
  - **Mount State Tracking**: Uses a ref to track component mount state to prevent operations on unmounted components

### 3. Optimized Chart Data Processing
- **Purpose**: Ensures chart data is properly formatted for consistent display
- **Implementation**:
  - **processChartData Function**: Pre-processes chart data to ensure proper layout settings
  - **Layout Normalization**: Ensures layout object exists and has appropriate configuration
  - **Autosize Enforcement**: Sets `autosize: true` to ensure proper responsiveness

### 4. Full-Screen Mode Implementation
- **Purpose**: Provides an immersive chart viewing experience
- **Key Features**:
  - **Toggle Function**: Switches between normal and full-screen modes
  - **Modal Overlay**: Creates a full-screen modal for enlarged chart display
  - **Keyboard Shortcut**: Supports ESC key to exit full-screen mode
  - **Style Preservation**: Maintains consistent styling in both modes

### 5. Clean Event Handling
- **Purpose**: Prevents memory leaks and ensures proper cleanup
- **Implementation**:
  - **Effect Cleanup**: Properly removes event listeners in useEffect cleanup function
  - **Timeout Clearing**: Clears any pending debounce timeouts on component unmount
  - **Mount State Management**: Tracks component mounted state to prevent operations on unmounted components

## Scripts and Commands

### Development
```bash
cd frontend
npm run dev
```
- Starts development server on http://localhost:3000
- Enables hot reloading
- Shows real-time compilation errors

### Production Build
```bash
npm run build
npm start
```
- Creates optimized production build
- Starts production server

## Next.js Features Used

1. **File-based Routing**
   - **How it works**: 
     - Pages are automatically routed based on their file names
     - `pages/about.js` → `/about`
     - `pages/blog/[id].js` → `/blog/1`, `/blog/2`, etc.
   - **Special Routes**:
     - Dynamic routes with `[param]` syntax
     - Catch-all routes with `[...param]`
     - Optional catch-all with `[[...param]]`
   - **Benefits**:
     - No manual route configuration needed
     - Intuitive directory structure
     - Built-in support for dynamic paths

2. **CSS Support**
   - **Global CSS**:
     - Import in `pages/_app.js`
     - Applies to all pages
     - Perfect for site-wide styles
   - **CSS Modules**:
     - Automatic class name scoping
     - Import as `styles` object
     - Prevents style conflicts
   - **Styled JSX**:
     - Built-in CSS-in-JS solution
     - Scoped to components
     - Dynamic styling with JavaScript
     - Used extensively in Header and Layout components
   - **CSS-in-JS Libraries**:
     - Support for Styled Components
     - Emotion integration
     - Other CSS-in-JS solutions

3. **API Routes**
   - **Purpose**:
     - Create serverless API endpoints
     - Handle form submissions
     - Authenticate users
   - **Features**:
     - Built-in API middleware
     - Request helpers
     - Response utilities
   - **Best Practices**:
     - Keep routes modular
     - Implement proper error handling
     - Use appropriate HTTP methods

4. **Server-Side Rendering (SSR)**
   - **Methods**:
     - `getServerSideProps`: Server-side rendering on every request
     - `getStaticProps`: Static generation at build time
     - `getStaticPaths`: Generate dynamic static pages
   - **Benefits**:
     - Better SEO
     - Faster initial page load
     - Improved performance
   - **Use Cases**:
     - Dynamic content
     - User-specific pages
     - SEO-critical pages

5. **Image Optimization**
   - **Features**:
     - Automatic image optimization
     - Lazy loading
     - Responsive images
   - **Component**: `next/image`
   - **Usage Example**: Used in the Header component to display the project logo
   - **Benefits**:
     - Improved performance
     - Reduced bandwidth
     - Better Core Web Vitals

6. **Built-in Performance Optimization**
   - **Automatic Code Splitting**:
     - Per-page code splitting
     - Dynamic imports
   - **Prefetching**:
     - Automatic page prefetching
     - Link component optimization
   - **Optimization Features**:
     - JavaScript minification
     - CSS optimization
     - Image optimization

## Theme and Styling

1. **Color Scheme**
   - **Primary Colors**:
     - Rich Black (#010203): Used for the header background
     - Shadow Black (#1B1610): Used for the main page background
     - Dark Blue (#0d1b2a): Used for the sidebar background
     - White (#FFFFFF) and Light Gray (#F8F8F8): Used for text for optimal contrast
   - **Accent Colors**:
     - Light Blue (#79B6F2): Used for links and interactive elements
   - **Implementation**: 
     - Header component uses Rich Black for a sophisticated look
     - Layout component sets Shadow Black as the app background
     - Sidebar component uses Dark Blue for visual distinction

2. **UI Components**
   - **Header**: Fixed at the top, 80px thick with project logo flush against the left edge followed by branding text
   - **Sidebar**: Toggleable navigation panel on the left side with Dark Blue (#0d1b2a) background
   - **Cards**: Slightly lighter background than the main page with hover effects
   - **Layout**: Consistent structure across all pages with proper spacing
   - **StockChart**: Interactive component with consistent styling and user-friendly controls

## Stock Analysis Feature

### 1. Overview
The Stock Analysis feature provides interactive stock charts with customizable technical indicators. Users can select different timeframes, intervals, chart types, and technical indicators to analyze stock market data.

### 2. Components
- **StockChart.js**: Main container component that orchestrates the entire stock chart functionality
- **StockSettingsSidebar.js**: Handles all user inputs including ticker symbol, days, interval, chart type, and indicator selection and configuration in a clean sidebar interface
- **ChartDisplay.js**: Renders the Plotly chart and manages loading states
- **ErrorMessage.js**: Displays error messages in a consistent style
- **LoadingOverlay.js**: Provides a reusable loading overlay component
- **Stock Analysis Page**: Container page that hosts the StockChart component and handles API connectivity

### 3. Configuration Options
- **Ticker Symbol**: Stock symbol to analyze (e.g., "AAPL", "MSFT")
- **Timeframe**: Number of days of historical data to analyze
- **Interval**: Data granularity (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)
- **Chart Type**: Candlestick or Line chart
- **Technical Indicators**:
  - Simple Moving Average (SMA) with configurable window size
  - Exponential Moving Average (EMA) with configurable window size
  - Bollinger Bands with configurable window size and standard deviation
  - Volume Weighted Average Price (VWAP)
  - Relative Strength Index (RSI) with configurable window size
  - Moving Average Convergence Divergence (MACD) with configurable fast, slow, and signal windows
  - Average True Range (ATR) with configurable window size
  - On-Balance Volume (OBV)
  - Stochastic Oscillator with configurable K and D windows
  - Ichimoku Cloud with configurable conversion, base, and lagging span periods
- **Panel Assignment**:
  - For each indicator, users can select which panel it should appear in:
    - Main price chart (for overlays like moving averages)
    - Oscillator panel (for bounded indicators like RSI)
    - MACD panel (for MACD indicator)
    - Volume panel (for volume-related indicators like OBV)
    - Volatility panel (for volatility indicators like ATR)

### 4. Multi-Panel Visualization
- **Purpose**: Organizes technical indicators into logical panel groups for better visualization
- **Implementation**: 
  - Indicators are grouped into panels based on their type and configuration
  - Each panel has specific styling and reference lines as needed
  - Panel heights are dynamically calculated based on content
  - All panels share x-axis zoom and pan controls
  - Legend entries are organized by panel
  - **Now uses consistent dark-themed styling and axis labels even with no subplots**
  - **Always removes market-closed time periods for a cleaner visualization**
- **Panel Types**:
  1. Main Panel
     - Primary price chart (candlestick/line)
     - Trend indicators (SMA, EMA, Bollinger Bands)
     - Ichimoku Cloud components
  2. Oscillator Panel
     - RSI with overbought/oversold lines
     - Stochastic Oscillator
     - Other bounded indicators
  3. MACD Panel
     - MACD lines and histogram
     - Zero reference line
  4. Volume Panel
     - Volume bars
     - On-Balance Volume (OBV)
     - Volume-based indicators
  5. Volatility Panel
     - Average True Range (ATR)
     - Other volatility metrics

### 5. Component Interaction
- **Data Flow**:
  - StockChart maintains the central state
  - User inputs from StockSettingsSidebar update the configuration state
  - Parameter changes from StockSettingsSidebar update indicator configurations
  - Updated configuration triggers API calls to fetch new chart data
  - Chart data is passed to ChartDisplay for rendering
  - KPI metrics are updated based on the selected ticker
- **Event Handling**:
  - User input changes are captured and processed in the appropriate component
  - Events are propagated up to the StockChart component via callback props
  - State updates trigger re-renders of affected components
  - Loading states and errors are managed at the StockChart level and propagated down
  - KPI ticker changes are synchronized with the chart ticker

### 6. API Communication
- **Service Layer**: The `stock.js` service handles communication with the backend API
- **Endpoints**:
  - `/api/stocks/analyze`: Fetch stock data and generate chart visualizations
    - Now accepts complex indicator configuration objects with customized parameters and panel assignments
  - `/api/health`: Check API availability
  - `/api/stocks/market-hours`: Fetch real-time market status and next state change information
- **Error Handling**: 
  - Comprehensive error handling with user-friendly messages
  - Uses error object pattern instead of exceptions to prevent Next.js runtime errors
  - Detailed error detection for common issues like invalid tickers
  - Visual error presentation with tailored suggestions based on error type
  - See the "Error Handling Pattern for API Services" section for implementation details
- **Optimizations**:
  - **Automatic chart reloading on indicator change with 500ms debouncing**
  - **Smarter state updates to minimize rendering cycles**
  - **Batched updates to prevent UI flicker**

### 7. User Experience Features
- **API Status Indicator**: Shows the connection status to the backend API
- **Loading States**: Maintains the current chart while loading new data
- **Error Messages**: Provides clear error messages and troubleshooting instructions
- **Responsive Design**: Adapts to different screen sizes
- **Consistent Styling**: Follows the application's dark theme
- **Interactive Updates**:
  - **Auto-refreshes when indicators are added/removed**
  - **Clear button labels indicating purpose (e.g., "Update Ticker/Time Period")**
  - **Updated UI feedback for all user interactions**
- **Full-screen Mode**:
  - Toggle button in the chart interface for expanding to full-screen view
  - Escape key support for exiting full-screen mode
  - Modal overlay that preserves all chart interactions
  - On-screen hint for keyboard shortcuts
- **KPI Dashboard**:
  - Interactive metrics dashboard below the chart
  - Key financial indicators for the current stock
  - Synchronized ticker selection with the main chart
  - Visual trend indicators for each metric
  - Grouping of related metrics for better organization

### 8. Development Mode Behavior
- **React StrictMode Effects**:
  - The application uses React StrictMode in development (configured in `next.config.js` with `reactStrictMode: true`)
  - This causes components to mount, unmount, and remount during development (but not in production)
  - Results in duplicate lifecycle method calls, useEffect triggers, and API requests
  - You will see duplicate logs and API calls in the browser console during development
  - This is **intentional behavior** designed to catch potential bugs and side effects
  - Example logs with instance tracking:
    ```
    StockChart component mounted (instance: chart-xxx)
    Loading chart for NVDA with 0 indicators (instance: chart-xxx)
    StockChart component unmounting (instance: chart-xxx)
    StockChart component mounted (instance: chart-xxx)  // Same instance remounting
    Loading chart for NVDA with 0 indicators (instance: chart-xxx)
    ```
  - **Production Behavior**: In production builds, this double-mounting doesn't occur, and API calls are made only once
  - **Benefits**: Helps identify impure rendering logic, unsafe lifecycle methods, and deprecated API usage
  - This behavior is kept intentionally to maintain development quality standards

## User Interface Components

## Logging and Error Handling

1. **Centralized Logging System**
   - **Implementation**: `src/utils/logger.js`
   - **Features**:
     - Environment-aware log levels (debug in development, warn in production)
     - Standardized logging methods (debug, info, warn, error)
     - Consistent formatting across the application
     - DRY implementation with utility functions to create loggers for different levels
     - Constants for environment names and log level configuration
   - **Benefits**:
     - Simplified debugging process
     - Reduced console noise in production
     - Foundation for future logging enhancements
     - Better code maintainability through modular design
   - **Recent Improvements**:
     - **Prevention of duplicate log entries in event handlers**
     - **More descriptive log messages for state changes**
     - **Proper batching of operations that generate logs**
     - **Enhanced documentation with JSDoc comments**

2. **Application-Level Logging**
   - **Implementation**: `src/pages/_app.js`
   - **Events Logged**:
     - Application initialization
     - Page navigation (start, complete, error)
     - Component rendering errors
   - **Purpose**:
     - Track application lifecycle
     - Monitor navigation performance
     - Catch and report rendering issues

3. **Component-Level Logging**
   - **Implementation**: Various components, including Header, Layout, StockChart, and index.js
   - **Events Logged**:
     - Component lifecycle (mount, unmount)
     - User interactions (clicks, form submissions)
     - State changes (when relevant)
   - **Purpose**:
     - Debug component behavior
     - Track user engagement
     - Monitor performance issues
   - **Recent Improvements**:
     - **Optimized state update logging in StockChart component**
     - **Better organized log messages for indicator configurations**
     - **More contextual information in error logs**

4. **Error Handling Pattern for API Services**
   - **Problem**: Next.js displays unhandled runtime errors when exceptions are thrown from API service functions, disrupting the user experience before custom error handling can take effect
   - **Solution**: Return error objects instead of throwing exceptions
   - **Implementation**: 
     ```javascript
     // Before: Throwing exceptions (problematic with Next.js)
     if (!response.ok) {
       const errorMessage = await processErrorResponse(response, ticker, requestId);
       throw new Error(errorMessage); // This triggers Next.js unhandled runtime error
     }
     
     // After: Returning error objects (works better with Next.js)
     if (!response.ok) {
       const errorMessage = await processErrorResponse(response, ticker, requestId);
       return { 
         error: true, 
         message: errorMessage,
         ticker: ticker
       };
     }
     ```
   - **Component Usage**:
     ```javascript
     // Before: Try/catch based error handling
     try {
       const data = await fetchStockChart(configToSend);
       setChartData(data);
     } catch (err) {
       const errorMessage = processApiError(err);
       setError(errorMessage);
     }
     
     // After: Error object pattern
     const response = await fetchStockChart(configToSend);
     if (response.error) {
       const errorMessage = processErrorMessage(response);
       setError(errorMessage);
     } else {
       setChartData(response);
     }
     ```
   - **Benefits**:
     - Prevents Next.js from displaying its error overlay during API errors
     - Allows custom error UI to handle and display errors
     - Improves user experience by keeping users in the application
     - Provides more control over error presentation
     - Maintains consistent error handling approach across the application
   - **Where Implemented**:
     - `services/api/stock.js`: `fetchStockChart` and `fetchMarketHours` functions
     - `components/stock/StockChart.js`: `loadChart` function
     - `components/stock/MarketHoursWidget.js`: `getMarketHours` function
   - **When to Use This Pattern**:
     - For any API service function where throwing an exception might be caught by Next.js error handling before your custom error UI can process it
     - When providing a better user experience for expected error conditions like invalid stock tickers
     - For API calls that need consistent error object structure across different services

5. **Error Boundaries**
   - **Implementation**: Try/catch blocks in critical rendering paths
   - **Purpose**:
     - Prevent application crashes
     - Log detailed error information
     - Provide graceful fallbacks when possible
   - **Enhanced Features**:
     - **Better recovery from API errors**
     - **Improved handling of visualization edge cases**
     - **Fallback rendering when subplot configuration fails**

6. **User-Facing Error Messages**
   - **Implementation**: `components/stock/ErrorMessage.js`
   - **Key Features**:
     - Consistent styling for all error types
     - Error categorization (ticker errors, processing errors, etc.)
     - Visual indicators with icons for different error types
     - Helpful suggestions based on error type
     - Responsive design that integrates with the application theme
   - **Error Types Handled**:
     - Non-existent ticker symbols
     - API processing errors
     - Connection issues
     - Configuration errors with indicators

7. **Future Enhancements**
   - Backend logging integration
   - Error aggregation and analysis
   - Performance monitoring
   - User session tracking

## Backend Integration

### 1. Stock Analysis API Integration
- **Purpose**: Connect to the FastAPI backend for stock data analysis
- **Implementation**:
  - Frontend service layer in `services/api/stock.js`
  - API health checks in `pages/stocks/index.js`
  - Chart loading and error handling in `components/stock/StockChart.js`
- **Features**:
  - Robust error handling with user-friendly messages
  - Health check before attempting to load charts
  - Loading states with previous chart preservation

### 2. Backend Communication Flow
- **Stock Analysis Request Flow**:
  1. User selects chart options (ticker, timeframe, indicators)
  2. Frontend sends a POST request to `/api/stocks/analyze`
  3. Backend retrieves and processes the data
  4. Backend returns Plotly figure JSON
  5. Frontend renders the chart with react-plotly.js
  6. Loading overlay is removed when new chart is ready

### 3. Error Handling Strategy
- **Network Errors**: Clear messages with retry options
- **Server Errors**: Parsed error messages from the backend with fallback text
- **Client Errors**: Validation before submission to prevent common issues
- **API Unavailability**: API health checks with fallback UI

## Development Guidelines

1. **File Organization**
   - Keep pages simple, move logic to components
   - Use appropriate directories for different types of components
   - Maintain clear separation of concerns

2. **Styling Approach**
   - Use Styled JSX for component-specific styles
   - Global styles in globals.css
   - Maintain consistent styling patterns
   - Follow the established dark theme color scheme

3. **Component Design Principles**
   - **Single Responsibility**: Each component should have a single, well-defined purpose
   - **Modular Structure**: Break down large components into smaller, focused ones
   - **Prop-Based Configuration**: Components should be configurable via props
   - **Smart/Dumb Component Pattern**: Separate container components (state management) from presentational components
   - **Reusability**: Utilize components that can be reused across the application

4. **Best Practices**
   - Follow React hooks guidelines
   - Implement proper error boundaries
   - Maintain proper TypeScript types
   - Use proper loading states for data fetching 

5. **Logging Best Practices**
   - Use appropriate log levels (debug for development details, info for significant events, warn for potential issues, error for failures)
   - Include contextual information in log messages
   - Wrap critical code sections in try/catch blocks with error logging
   - Avoid logging sensitive information 

6. **Backend Integration Guidelines**
   - Use the services layer for all API communication
   - Implement proper error handling for all API calls
   - Check API health before attempting data operations
   - Provide graceful degradation when backend services are unavailable

### 11. Stock Analysis Components

#### 11.1. `StockChart.js`
- **Purpose**: Main component for stock chart visualization and control
- **Location**: `frontend/src/components/stock/StockChart.js`
- **Key Features**:
  - Central state management for chart configuration
  - Integration with backend for chart data retrieval
  - Event handling for user inputs
  - Sub-component composition and organization
  - Error handling and fallback rendering
  - Exposes callbacks for ticker changes and other events

#### 11.6. `MarketHoursWidget.js`
- **Purpose**: Displays market status (open/closed) and countdown to market open/close
- **Location**: `frontend/src/components/stock/MarketHoursWidget.js`
- **Key Features**:
  - Real-time countdown timer for market state changes
  - Visual indicators for market open/closed status
  - Automatic refresh when the market state changes
  - Responsive styling that matches the application theme
  - Integration with stock ticker selection
  - Properly handles different exchanges and time zones
  - Regular polling for market status updates
- **State Management**:
  - Maintains market status from API response
  - Tracks countdown timer internally
  - Handles loading and error states
- **Integration Points**:
  - Used in the StocksPage component
  - Receives ticker prop from parent
  - Makes API requests through the stock service
- **UX Considerations**:
  - Clear visual indicators (green for open, red for closed)
  - Readable countdown format (HH:MM:SS)
  - Smooth animation for loading states
  - Clear error messages when API calls fail
  - Hover effects for user feedback

### 15. API Service Implementation

#### 15.1 Overview
Each API service module follows a consistent pattern to ensure maintainable and robust API communication. Here's the overview of how API services are implemented:

#### 15.4 Stock API Service
The `stock.js` service module contains all functions related to stock data retrieval and analysis.

- **Location**: `frontend/src/services/api/stock.js`
- **Base Configuration**:
  - Uses the centralized API client with common headers
  - Handles automatic error mapping to frontend-friendly formats
- **Key Functions**:
  - `fetchStockData(ticker, days, interval, indicators, chartType)`: Retrieves stock chart data
  - `fetchKPIs(ticker, kpiGroups, timeframe)`: Retrieves key performance indicators
  - `checkApiHealth()`: Checks if the API server is available
  - `fetchMarketHours(ticker)`: Retrieves market hours and status information
- **Integration**:
  - Used by stock-related components like `StockChart` and `MarketHoursWidget`
  - Maintains consistent error handling and logging patterns
  - Provides typed results for improved code completion and validation

#### 15.5 Common API Error Patterns
During implementation, we encountered several common API error patterns that required specific handling strategies:

1. **API Connection Issues**:
   - Symptom: Failed to fetch, network errors
   - Handling: Retry logic, clear error messages suggesting API server may be down
   
2. **404 Endpoint Errors**:
   - Symptom: "Request failed with status code 404"
   - Cause: Incorrect endpoint URL or the endpoint not being registered on the server
   - Resolution: 
     - For the market hours implementation, we encountered a 404 error because the frontend was not using the configured API base URL
     - Fixed by modifying the `MarketHoursWidget` to use the central `fetchMarketHours` function from the stock API service
     - Added proper logging to trace API request failures

3. **Invalid Input Errors**:
   - Symptom: 400 Bad Request, 422 Validation Error
   - Handling: Input validation before API calls, clear error messages explaining the issue
   
4. **Authentication Errors**:
   - Symptom: 401 Unauthorized, 403 Forbidden
   - Handling: Automatic refreshing of credentials where applicable, redirecting to login when necessary

5. **Service Unavailable Errors**:
   - Symptom: 503 Service Unavailable
   - Handling: Exponential backoff retry logic, clear messaging about temporary service disruption

6. **CORS Issues**:
   - Symptom: Cross-Origin Request Blocked
   - Resolution: Configured the backend to allow requests from the frontend origin

### 16. Frontend-Backend Integration Patterns

#### 16.1 Market Hours Integration
The market hours feature provides a good example of frontend-backend integration:

1. **Backend Component**: 
   - `MarketHoursTracker` class in `market_hours.py` determines market status and times
   - FastAPI endpoint `/api/stocks/market-hours` exposes this functionality via HTTP

2. **Frontend Service Layer**:
   - `fetchMarketHours` function in `stock.js` makes the API request
   - Handles errors and response formatting
   - Acts as the intermediary between components and the API

3. **Frontend Component**:
   - `MarketHoursWidget.js` consumes the service to display data
   - Manages local state for countdown and updates
   - Handles loading, error, and data display states

4. **Integration Challenges Encountered**:
   - API 404 error: Initially calling the API endpoint directly rather than using the service layer
   - Fix: Changed direct axios call to use service function with proper base URL
   - Styling issues: White background made text hard to read
   - Fix: Matched styling with the app's dark theme using color constants from other components

5. **Best Practices Applied**:
   - Consistent error handling across all layers
   - Regular data refresh for time-sensitive information
   - Clear separation of responsibilities between layers
   - Matching styling to maintain theme consistency
   - Graceful degradation when services are unavailable