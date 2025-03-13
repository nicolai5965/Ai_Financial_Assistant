/**
 * KPI API service for fetching Key Performance Indicators.
 * 
 * This service provides functions for fetching stock KPI data from the
 * backend API, with standardized error handling and logging.
 */

import { logger } from '../../utils/logger';

// Constants for API configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const KPI_ENDPOINT = `${API_URL}/api/stocks/kpi`;
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout
const RETRY_COUNT = 2; // Number of retries for failed requests

/**
 * Fetch KPI data for a stock ticker.
 * 
 * @param {string} ticker - The stock ticker symbol
 * @param {string[]} [kpiGroups] - Optional array of KPI groups to fetch
 * @param {string} [timeframe='1d'] - Timeframe for KPI data
 * @param {boolean} [useCache=true] - Whether to use cached data if available
 * @returns {Promise<Object>} - The KPI data
 */
export async function fetchStockKpis(ticker, kpiGroups = [], timeframe = '1d', useCache = true) {
  // Generate a unique ID for this request for logging purposes
  const requestId = `kpi-${Date.now()}`;
  
  // Convert ticker to uppercase
  ticker = ticker.toUpperCase().trim();
  
  // Log the request
  logger.info(`[${requestId}] Fetching KPIs for ${ticker} (${timeframe}): ${kpiGroups.join(', ')}`);
  
  // Prepare the request body
  const requestBody = {
    ticker,
    kpi_groups: kpiGroups.length > 0 ? kpiGroups : undefined,
    timeframe,
    use_cache: useCache
  };
  
  // Function to perform the actual fetch
  const performFetch = async (attempt = 1) => {
    try {
      // Create AbortController for timeout management
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      // Perform the fetch with timeout
      const response = await fetch(KPI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Check for successful response
      if (!response.ok) {
        return await processErrorResponse(response, ticker, requestId);
      }
      
      // Parse the response
      const data = await response.json();
      logger.debug(`[${requestId}] Successfully received KPI data for ${ticker}`);
      
      return data;
    } catch (error) {
      // Handle timeout errors
      if (error.name === 'AbortError') {
        logger.error(`[${requestId}] Request timeout for ${ticker}`);
        throw new Error(`Request timeout after ${REQUEST_TIMEOUT / 1000} seconds`);
      }
      
      // Handle network errors with retry logic
      if (attempt <= RETRY_COUNT) {
        const nextAttempt = attempt + 1;
        const delay = 1000 * attempt; // Exponential backoff
        
        logger.warn(`[${requestId}] Fetch attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return performFetch(nextAttempt);
      }
      
      // All retries failed
      logger.error(`[${requestId}] All fetch attempts failed for ${ticker}: ${error.message}`);
      throw new Error(`Failed to fetch KPI data: ${error.message}`);
    }
  };
  
  // Start the fetch process
  return performFetch();
}

/**
 * Process error responses from the API.
 * 
 * @param {Response} response - The fetch Response object
 * @param {string} ticker - The ticker being requested
 * @param {string} requestId - The unique ID for this request
 * @returns {Promise<never>} - Throws an error with details
 */
async function processErrorResponse(response, ticker, requestId) {
  try {
    // Try to parse the error response as JSON
    const errorData = await response.json();
    const errorMessage = errorData.detail || 'Unknown error';
    
    logger.error(`[${requestId}] API error for ${ticker}: ${response.status} - ${errorMessage}`);
    
    // Create user-friendly error messages based on status code
    if (response.status === 404) {
      throw new Error(`No data found for ${ticker}`);
    } else if (response.status === 400) {
      throw new Error(`Invalid request: ${errorMessage}`);
    } else {
      throw new Error(`Server error (${response.status}): ${errorMessage}`);
    }
  } catch (e) {
    // If JSON parsing fails, use the status text
    logger.error(`[${requestId}] Failed to parse error response: ${e.message}`);
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
}

/**
 * Check if the KPI API is available.
 * 
 * @returns {Promise<boolean>} - True if the API is available
 */
export async function checkKpiApiHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`, { 
      method: 'GET',
      cache: 'no-store'
    });
    return response.ok;
  } catch (error) {
    logger.error(`Error checking KPI API health: ${error.message}`);
    return false;
  }
}
