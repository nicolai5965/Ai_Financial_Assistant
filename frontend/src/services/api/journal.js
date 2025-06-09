/**
 * API service for interacting with the backend's Trading Journal endpoints.
 */
import { logger } from '../../utils/logger';

// Default API URL - should be consistent with stock.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Request configuration - can be shared or specific
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout
const RETRY_COUNT = 2; // Number of retries for failed requests

/**
 * Generate a simple unique ID for request tracking.
 * @returns {string} A unique request identifier.
 */
const generateRequestId = () => {
  return 'req-journal-' + Math.random().toString(36).substring(2, 9);
};

/**
 * Perform a fetch request with timeout and retry logic.
 * This is a helper function to encapsulate the fetch logic.
 * @param {string} url - The URL to fetch from.
 * @param {Object} options - Fetch options.
 * @param {string} requestId - Request ID for logging.
 * @returns {Promise<Response>} The fetch response.
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
 * Fetches a paginated list of trade logs from the trading journal API.
 * 
 * @param {Object} params - The parameters for fetching journal trades.
 * @param {number} [params.page=1] - The page number to fetch.
 * @param {number} [params.limit=20] - The number of items per page.
 * @returns {Promise<Object>} - The paginated trade data or an error object.
 */
export async function fetchJournalTrades({ page = 1, limit = 20 }) {
  const requestId = generateRequestId();
  const url = `${API_URL}/api/journal/trades?page=${page}&limit=${limit}`;

  try {
    logger.info(`Fetching journal trades (page: ${page}, limit: ${limit}) from: ${url} (request: ${requestId})`);

    const response = await performFetchWithRetry(
      url,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      requestId
    );

    if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Error response from server (${response.status}): ${errorText}`);
        return {
            error: true,
            message: `Failed to fetch journal data: ${response.statusText || 'Server error'}`,
            details: errorText,
        };
    }

    const data = await response.json();
    logger.info(`Successfully fetched journal data (request: ${requestId})`, data);
    return data; // Expected to be { trades: [...], total_count: ..., ... }

  } catch (error) {
    const errorMessage = error?.message || 'An unknown error occurred while fetching journal trades.';
    logger.error(`Failed to fetch journal trades (request: ${requestId}): ${errorMessage}`);
    return {
      error: true,
      message: errorMessage,
    };
  }
}

/**
 * Submits a new trade log from raw text for processing and storage.
 * 
 * @param {string} rawText - The raw, multi-line text of the trade log.
 * @returns {Promise<Object>} - The newly created and processed trade object, or an error object.
 */
export async function submitJournalTrade(rawText) {
  const requestId = generateRequestId();
  const url = `${API_URL}/api/journal/trades`;

  try {
    logger.info(`Submitting new journal trade... (request: ${requestId})`);

    const response = await performFetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_trade_text: rawText,
        }),
      },
      requestId
    );

    const responseData = await response.json();

    if (!response.ok) {
      const errorMessage = responseData.detail || `Failed to submit trade: ${response.statusText}`;
      logger.error(`Error submitting trade (request: ${requestId}):`, responseData);
      return {
          error: true,
          message: errorMessage,
      };
    }
    
    logger.info(`Successfully submitted and processed new trade (request: ${requestId})`, responseData);
    return responseData; // This should be the newly created trade object

  } catch (error) {
    const errorMessage = error?.message || 'An unknown error occurred while submitting the trade.';
    logger.error(`Failed to submit journal trade (request: ${requestId}): ${errorMessage}`);
    return {
      error: true,
      message: errorMessage,
    };
  }
} 