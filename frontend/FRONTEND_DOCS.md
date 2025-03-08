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
│   │   │   └── StockChart.js # Interactive stock chart component
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
│   │       └── stock.js  # Stock analysis API service
│   ├── styles/           # CSS and styling files
│   │   └── globals.css   # Global styles
│   ├── types/            # TypeScript type definitions (currently empty)
│   └── utils/            # Utility functions and helpers
│       └── logger.js     # Centralized logging utility for the frontend
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
      - **Styling**: Uses Styled JSX for component-scoped styles
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
  - `stock/`: Contains components for stock market analysis
    - `StockChart.js`:
      - **Purpose**: Provides an interactive stock chart with configurable options
      - **Features**:
        - Dynamic loading of Plotly charts to optimize performance
        - Form controls for customizing chart appearance and data
        - Support for multiple chart types (candlestick and line)
        - Technical indicator selection (SMA, EMA, Bollinger Bands, VWAP)
        - Maintains the current chart while loading new data to prevent UI flicker
        - Error handling with user-friendly messages
      - **Implementation Details**:
        - Uses React hooks for state management
        - Implements loading states with visual feedback
        - Integrates with the stock API service
        - Dynamically parses and renders Plotly JSON data
      - **Styling**: Uses Styled JSX for component-scoped styles
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
      - `checkApiHealth()`: Checks if the stock analysis API is available
    - **Features**:
      - Robust error handling with informative error messages
      - Typed function parameters and return values
      - Integration with the logging system
      - Configurable API URL for different environments

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
      - Configurable log levels based on environment (development vs. production)
      - Supports standard log levels: debug, info, warn, error
      - Prevents excessive logging in production (defaults to warn level)
      - Extensible design for future backend logging integration
    - **Usage**: Imported in components to log events, errors, and user interactions
    - **Benefits**:
      - Consistent logging patterns across the application
      - Easy to enable/disable logs based on environment
      - Centralized control over logging behavior

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
- **StockChart**: Main component for displaying stock data visualizations
- **Stock Analysis Page**: Container page that hosts the StockChart component and handles API connectivity

### 3. Configuration Options
- **Ticker Symbol**: Stock symbol to analyze (e.g., "AAPL", "MSFT")
- **Timeframe**: Number of days of historical data to analyze
- **Interval**: Data granularity (1m, 5m, 15m, 30m, 1h, 1d)
- **Chart Type**: Candlestick or Line chart
- **Technical Indicators**:
  - Simple Moving Average (SMA)
  - Exponential Moving Average (EMA)
  - Bollinger Bands
  - Volume Weighted Average Price (VWAP)

### 4. API Communication
- **Service Layer**: The `stock.js` service handles communication with the backend API
- **Endpoints**:
  - `/api/stocks/analyze`: Fetch stock data and generate chart visualizations
  - `/api/health`: Check API availability
- **Error Handling**: Comprehensive error handling with user-friendly messages

### 5. User Experience Features
- **API Status Indicator**: Shows the connection status to the backend API
- **Loading States**: Maintains the current chart while loading new data
- **Error Messages**: Provides clear error messages and troubleshooting instructions
- **Responsive Design**: Adapts to different screen sizes
- **Consistent Styling**: Follows the application's dark theme

## Logging and Error Handling

1. **Centralized Logging System**
   - **Implementation**: `src/utils/logger.js`
   - **Features**:
     - Environment-aware log levels (debug in development, warn in production)
     - Standardized logging methods (debug, info, warn, error)
     - Consistent formatting across the application
   - **Benefits**:
     - Simplified debugging process
     - Reduced console noise in production
     - Foundation for future logging enhancements

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
   - **Implementation**: Various components, including Header, Layout, and index.js
   - **Events Logged**:
     - Component lifecycle (mount, unmount)
     - User interactions (clicks, form submissions)
     - State changes (when relevant)
   - **Purpose**:
     - Debug component behavior
     - Track user engagement
     - Monitor performance issues

4. **Error Boundaries**
   - **Implementation**: Try/catch blocks in critical rendering paths
   - **Purpose**:
     - Prevent application crashes
     - Log detailed error information
     - Provide graceful fallbacks when possible

5. **Future Enhancements**
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

3. **Best Practices**
   - Follow React hooks guidelines
   - Implement proper error boundaries
   - Maintain proper TypeScript types
   - Use proper loading states for data fetching 

4. **Logging Best Practices**
   - Use appropriate log levels (debug for development details, info for significant events, warn for potential issues, error for failures)
   - Include contextual information in log messages
   - Wrap critical code sections in try/catch blocks with error logging
   - Avoid logging sensitive information 

5. **Backend Integration Guidelines**
   - Use the services layer for all API communication
   - Implement proper error handling for all API calls
   - Check API health before attempting data operations
   - Provide graceful degradation when backend services are unavailable 