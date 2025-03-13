/**
 * Stock API service for interaction with the backend stock analysis API.
 * Handles stock data fetching and API health checking.
 */
const logger = require('../../utils/logger');

// Default API URL - adjust this based on your environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
      errorMessage = errorData.detail || errorData.message || errorMessage;
      
      // Check specifically for 404 errors related to tickers
      if (response.status === 404 && errorMessage.includes('No data')) {
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
 * Fetch stock data and generate a chart based on provided parameters.
 * 
 * @param {Object} config - The configuration for the stock analysis
 * @param {string} config.ticker - Stock ticker symbol (e.g., 'AAPL')
 * @param {number} [config.days=10] - Number of days to look back
 * @param {string} [config.interval='1d'] - Data interval ('1d', '1h', '5m', etc.)
 * @param {Array} [config.indicators=[]] - List of technical indicators to include. 
 *                                         Can be strings or objects with name and parameters.
 * @param {string} [config.chartType='candlestick'] - Chart type ('candlestick' or 'line')
 * @returns {Promise<Object>} - The chart data as a Plotly JSON object
 */
export async function fetchStockChart(config) {
  const { ticker, days = 10, interval = '1d', indicators = [], chartType = 'candlestick' } = config;
  const requestId = generateRequestId(); // Generate unique ID for this request
  
  try {
    logger.info(`Fetching stock chart for ${ticker} with ${indicators.length} indicators (request: ${requestId})`);
    
    // Format all indicators using the helper function
    const formattedIndicators = indicators.map(formatIndicator);
    
    logger.debug(`Formatted indicators for API request (request: ${requestId}):`, formattedIndicators);
    
    const response = await fetch(`${API_URL}/api/stocks/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticker,
        days,
        interval,
        indicators: formattedIndicators,
        chart_type: chartType
      }),
    });

    if (!response.ok) {
      // Extract error message using the helper function
      const errorMessage = await processErrorResponse(response, ticker, requestId);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    logger.info(`Successfully fetched stock chart for ${ticker} (request: ${requestId})`);
    return data;
  } catch (error) {
    // Safer error logging with consistent format
    const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
    logger.error(`Failed to fetch stock chart (request: ${requestId}): ${errorMessage}`);
    throw error;
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
    const response = await fetch(`${API_URL}/api/health`);
    
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
    const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
    logger.error(`API health check failed (request: ${requestId}): ${errorMessage}`);
    return false;
  }
} 