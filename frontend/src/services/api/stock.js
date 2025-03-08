/**
 * Stock API service for interaction with the backend stock analysis API.
 */
const logger = require('../../utils/logger');

// Default API URL - adjust this based on your environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Fetch stock data and generate a chart based on provided parameters.
 * 
 * @param {Object} config - The configuration for the stock analysis
 * @param {string} config.ticker - Stock ticker symbol (e.g., 'AAPL')
 * @param {number} [config.days=10] - Number of days to look back
 * @param {string} [config.interval='1d'] - Data interval ('1d', '1h', '5m', etc.)
 * @param {string[]} [config.indicators=[]] - List of technical indicators to include
 * @param {string} [config.chartType='candlestick'] - Chart type ('candlestick' or 'line')
 * @returns {Promise<Object>} - The chart data as a Plotly JSON object
 */
export async function fetchStockChart(config) {
  const { ticker, days = 10, interval = '1d', indicators = [], chartType = 'candlestick' } = config;
  
  try {
    logger.info(`Fetching stock chart for ${ticker} with ${interval} interval`);
    
    const response = await fetch(`${API_URL}/api/stocks/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticker,
        days,
        interval,
        indicators,
        chart_type: chartType
      }),
    });

    if (!response.ok) {
      // More defensive error handling
      let errorMessage = `Failed to fetch stock data: ${response.status} ${response.statusText || ''}`;
      
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object') {
          errorMessage = errorData.detail || errorData.message || errorMessage;
        }
      } catch (jsonError) {
        // If parsing JSON fails, use the default error message
        logger.error(`Error parsing error response: ${jsonError.message}`);
      }
      
      logger.error(`Error fetching stock data: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    logger.info(`Successfully fetched stock chart for ${ticker}`);
    return data;
  } catch (error) {
    // Safer error logging
    const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
    logger.error(`Failed to fetch stock chart: ${errorMessage}`);
    throw error;
  }
}

/**
 * Check if the API server is up and running.
 * @returns {Promise<boolean>} - True if the API is available
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (response.ok) {
      try {
        const data = await response.json();
        return data && data.status === 'healthy';
      } catch (jsonError) {
        logger.error(`Error parsing health check response: ${jsonError.message || 'Unknown error'}`);
        return false;
      }
    }
    return false;
  } catch (error) {
    const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
    logger.error(`API health check failed: ${errorMessage}`);
    return false;
  }
} 