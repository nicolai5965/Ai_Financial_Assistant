/**
 * Stock API service for interaction with the backend stock analysis API.
 * Handles stock data fetching and API health checking.
 */
import { logger } from '../../utils/logger';

// Default API URL - adjust this based on your environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Stock Configuration Constants
 * Centralized configuration values for stock-related functionality
 */
// Default ticker symbol used throughout the application
export const DEFAULT_TICKER = 'AAPL';

// Default chart configuration used for initial load and resets
export const DEFAULT_CHART_CONFIG = {
  ticker: DEFAULT_TICKER,
  days: 10,
  interval: '1h',
  indicators: [],
  chartType: 'candlestick'
};

// Auto-refresh interval in minutes
export const REFRESH_INTERVAL = 5;

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
 * Fetch stock data and generate a chart based on provided parameters.
 * 
 * @param {Object} config - The configuration for the stock analysis
 * @param {string} config.ticker - Stock ticker symbol (e.g., 'AAPL')
 * @param {number} [config.days=10] - Number of days to look back
 * @param {string} [config.interval='1d'] - Data interval ('1d', '1h', '5m', etc.)
 * @param {Array} [config.indicators=[]] - List of technical indicators to include. 
 *                                         Can be strings or objects with name and parameters.
 * @param {string} [config.chartType='candlestick'] - Chart type ('candlestick' or 'line')
 * @returns {Promise<Object>} - The chart data as a Plotly JSON object or an error object
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
      
      // Instead of throwing the error, return an error object
      return { 
        error: true, 
        message: errorMessage,
        ticker: ticker
      };
    }

    const data = await response.json();
    logger.info(`Successfully fetched stock chart for ${ticker} (request: ${requestId})`);
    return data;
  } catch (error) {
    // Safer error logging with consistent format
    const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
    logger.error(`Failed to fetch stock chart (request: ${requestId}): ${errorMessage}`);
    
    // Return an error object instead of re-throwing
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

/**
 * Fetch market hours data for a specific ticker.
 * 
 * @param {string} ticker - Stock ticker symbol (e.g., 'AAPL')
 * @returns {Promise<Object>} - Market hours status information or error object
 */
export async function fetchMarketHours(ticker) {
  const requestId = generateRequestId();
  
  try {
    logger.info(`Fetching market hours for ${ticker} (request: ${requestId})`);
    
    const response = await fetch(`${API_URL}/api/stocks/market-hours`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticker }),
    });

    if (!response.ok) {
      // Extract error message using the helper function
      const errorMessage = await processErrorResponse(response, ticker, requestId);
      
      // Return an error object instead of throwing
      return {
        error: true,
        message: errorMessage,
        ticker: ticker
      };
    }

    const data = await response.json();
    logger.info(`Successfully fetched market hours for ${ticker} (request: ${requestId})`);
    return data;
  } catch (error) {
    // Safer error logging with consistent format
    const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
    logger.error(`Failed to fetch market hours (request: ${requestId}): ${errorMessage}`);
    
    // Return an error object instead of re-throwing
    return {
      error: true,
      message: errorMessage,
      ticker: ticker
    };
  }
}

/**
 * Fetch company information for a specific ticker.
 * 
 * @param {string} ticker - Stock ticker symbol (e.g., 'AAPL')
 * @returns {Promise<Object>} - Company information or error object
 */
export async function fetchCompanyInfo(ticker) {
  const requestId = generateRequestId();
  
  try {
    logger.info(`Fetching company info for ${ticker} (request: ${requestId})`);
    
    const response = await fetch(`${API_URL}/api/stocks/company-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticker }),
    });

    if (!response.ok) {
      // Extract error message using the helper function
      const errorMessage = await processErrorResponse(response, ticker, requestId);
      
      // Return an error object instead of throwing
      return {
        error: true,
        message: errorMessage,
        ticker: ticker
      };
    }

    const data = await response.json();
    logger.info(`Successfully fetched company info for ${ticker} (request: ${requestId})`);
    return data;
  } catch (error) {
    // Safer error logging with consistent format
    const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
    logger.error(`Failed to fetch company info (request: ${requestId}): ${errorMessage}`);
    
    // Return an error object instead of re-throwing
    return { 
      error: true, 
      message: errorMessage,
      ticker: ticker
    };
  }
} 