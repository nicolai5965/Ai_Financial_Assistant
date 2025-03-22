/**
 * Stock API service for interaction with the backend stock analysis API.
 * Handles stock data fetching and API health checking.
 */
import { logger } from '../../utils/logger';

// Default API URL - adjust this based on your environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Request configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout
const RETRY_COUNT = 2; // Number of retries for failed requests

// Auto-refresh interval in minutes
export const REFRESH_INTERVAL = 5;

// Default KPI configuration
export const DEFAULT_KPI_CONFIG = {
  groups: ['price', 'volume', 'volatility', 'fundamental'],
  timeframe: '1d',
  useCache: true
};


/**
 * Generate a simple unique ID for request tracking
 * @returns {string} A unique request identifier
 */
const generateRequestId = () => {
  return 'req-' + Math.random().toString(36).substring(2, 9);
};

/**
 * Format an indicator object for API submission
 * @param {string|Object} ind - The indicator to format (string or object)
 * @returns {Object} Properly formatted indicator object
 */
const formatIndicator = (ind) => {
  // Simple string indicator - this shouldn't happen with panel assignments
  if (typeof ind === 'string') {
    return ind;
  } 
  
  // Process object-based indicator
  if (typeof ind === 'object' && ind.name) {
    // Create a properly formatted indicator config object with required fields first
    const formattedInd = { 
      name: ind.name 
    };
    
    // Add panel if provided
    if (ind.panel) {
      formattedInd.panel = ind.panel;
    }
    
    // Process each parameter to ensure proper typing
    Object.entries(ind).forEach(([key, value]) => {
      // Skip name as we've already added it
      if (key === 'name') return;
      
      // Skip null or undefined values
      if (value === null || value === undefined) return;
      
      // Convert numeric strings to actual numbers except for panel
      if (typeof value === 'string' && !isNaN(value) && key !== 'panel') {
        formattedInd[key] = Number(value);
      } else if (key !== 'panel' || !formattedInd.panel) { 
        // Only add panel if it wasn't added earlier
        formattedInd[key] = value;
      }
    });
    
    return formattedInd;
  } 
  
  // Fallback for invalid formats
  logger.warning('Invalid indicator format, using default', ind);
  return typeof ind === 'string' ? ind : String(ind);
};

/**
 * Process API error response and extract meaningful error message
 * @param {Response} response - The fetch response object
 * @param {string} ticker - The ticker symbol being processed
 * @param {string} requestId - The request ID for tracking
 * @returns {Promise<string>} Processed error message
 */
const processErrorResponse = async (response, ticker, requestId) => {
  let errorMessage = `Failed to fetch stock data: ${response.status} ${response.statusText || ''}`;
  
  try {
    const errorData = await response.json();
    if (errorData && typeof errorData === 'object') {
      // Try to get the most specific error message
      errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
      
      // Log the full error data for debugging
      logger.debug(`Error response data (request: ${requestId}):`, errorData);
      
      // Check specifically for 404 errors related to tickers
      if (response.status === 404 || errorMessage.includes('No data')) {
        errorMessage = `No data found for ticker ${ticker}`;
      }
      
      // Check if there's error details about the ticker
      if (errorMessage.toLowerCase().includes('ticker') && 
          (errorMessage.toLowerCase().includes('invalid') || 
           errorMessage.toLowerCase().includes('not found'))) {
        errorMessage = `No data found for ticker ${ticker}`;
      }
    }
  } catch (jsonError) {
    // If parsing JSON fails, use the default error message
    logger.error(`Error parsing error response (request: ${requestId}): ${jsonError.message}`);
    
    // Special case for 404 ticker errors if JSON parsing failed
    if (response.status === 404) {
      errorMessage = `No data found for ticker ${ticker}`;
    }
  }
  
  logger.error(`Error fetching stock data (request: ${requestId}): ${errorMessage}`);
  return errorMessage;
};

/**
 * Perform a fetch request with timeout and retry logic
 * @param {string} url - The URL to fetch from
 * @param {Object} options - Fetch options
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<Response>} The fetch response
 */
const performFetchWithRetry = async (url, options, requestId) => {
  let attempt = 1;
  
  while (attempt <= RETRY_COUNT + 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.error(`Request timeout (request: ${requestId})`);
        throw new Error(`Request timeout after ${REQUEST_TIMEOUT / 1000} seconds`);
      }
      
      if (attempt <= RETRY_COUNT) {
        const delay = 1000 * attempt;
        logger.warn(`Fetch attempt ${attempt} failed, retrying in ${delay}ms... (request: ${requestId})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      } else {
        throw error;
      }
    }
  }
};

/**
 * Fetch all dashboard data for a specific stock in a single request.
 * This includes chart data, KPIs, market hours, and company information.
 * 
 * @param {Object} config - The configuration for the dashboard data
 * @param {string} config.ticker - Stock ticker symbol (e.g., 'AAPL')
 * @param {number} [config.days=10] - Number of days to look back
 * @param {string} [config.interval='1d'] - Data interval ('1d', '1h', '5m', etc.)
 * @param {Array} [config.indicators=[]] - List of technical indicators to include
 * @param {string} [config.chartType='candlestick'] - Chart type ('candlestick' or 'line')
 * @param {Array} [config.kpiGroups=[]] - List of KPI groups to include
 * @param {string} [config.kpiTimeframe='1d'] - Timeframe for KPI calculations
 * @param {boolean} [config.useCache=true] - Whether to use cached data
 * @returns {Promise<Object>} - The complete dashboard data or error object
 */
export async function fetchDashboardData(config) {
  const requestId = generateRequestId();
  const {
    ticker,
    days = 10,
    interval = '1d',
    indicators = [],
    chartType = 'candlestick',
    kpiGroups = DEFAULT_KPI_CONFIG.groups,
    kpiTimeframe = DEFAULT_KPI_CONFIG.timeframe,
    useCache = DEFAULT_KPI_CONFIG.useCache
  } = config;
  

  try {
    logger.info(`Fetching dashboard data for ${ticker} (request: ${requestId})`);

    // Format indicators using the helper function
    const formattedIndicators = indicators.map(formatIndicator);
    logger.debug(`Formatted indicators for API request (request: ${requestId}):`, formattedIndicators);

    const response = await performFetchWithRetry(
      `${API_URL}/api/stocks/dashboard-data`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker,
          days,
          interval,
          indicators: formattedIndicators,
          chart_type: chartType,
          kpi_groups: kpiGroups,
          kpi_timeframe: kpiTimeframe,
          use_cache: useCache
        }),
      },
      requestId
    );

    // Log the raw response
    console.log(`Raw API response (request: ${requestId}):`, response);

    if (!response.ok) {
      const errorMessage = await processErrorResponse(response, ticker, requestId);
      return {
        error: true,
        message: errorMessage,
        ticker: ticker
      };
    }

    const data = await response.json();
    // Log the parsed data
    console.log(`Parsed API data (request: ${requestId}):`, data);

    logger.info(`Successfully fetched dashboard data for ${ticker} (request: ${requestId})`);
    return data;
  } catch (error) {
    const errorMessage = error?.message || 'Unknown error occurred';
    logger.error(`Failed to fetch dashboard data (request: ${requestId}): ${errorMessage}`);
    return {
      error: true,
      message: errorMessage,
      ticker: ticker
    };
  }
}

/**
 * Check if the API server is up and running.
 * @returns {Promise<boolean>} - True if the API is available
 */
export async function checkApiHealth() {
  const requestId = generateRequestId();
  
  try {
    logger.debug(`Performing API health check (request: ${requestId})`);
    const response = await performFetchWithRetry(
      `${API_URL}/api/health`,
      {
        method: 'GET',
        cache: 'no-store'
      },
      requestId
    );
    
    if (response.ok) {
      try {
        const data = await response.json();
        const isHealthy = data && data.status === 'healthy';
        logger.debug(`API health check result (request: ${requestId}): ${isHealthy ? 'healthy' : 'unhealthy'}`);
        return isHealthy;
      } catch (jsonError) {
        logger.error(`Error parsing health check response (request: ${requestId}): ${jsonError.message || 'Unknown error'}`);
        return false;
      }
    }
    
    logger.warn(`API health check failed with status ${response.status} (request: ${requestId})`);
    return false;
  } catch (error) {
    const errorMessage = error?.message || 'Unknown error occurred';
    logger.error(`API health check failed (request: ${requestId}): ${errorMessage}`);
    return false;
  }
} 