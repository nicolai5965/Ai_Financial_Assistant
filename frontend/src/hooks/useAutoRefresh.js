// useAutoRefresh.js (Minor Changes)
import { useEffect, useRef, useState, useCallback } from 'react';
import { REFRESH_INTERVAL } from '../services/api/stock'; // adjust the path as needed
import { logger } from '../utils/logger';

export default function useAutoRefresh(fetchDataCallback) {
  const refreshTimerRef = useRef(null);
  const DEFAULT_REFRESH_INTERVAL = REFRESH_INTERVAL * 60 * 1000; // Convert minutes to ms
  const [showAutoRefreshNotif, setShowAutoRefreshNotif] = useState(false);

  const setupRefreshTimer = useCallback(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    // Set a new timer
    refreshTimerRef.current = setTimeout(async () => {
      logger.debug(`Auto-refresh timer triggered at ${new Date().toLocaleTimeString()}`);
      // Call the fetch function
      await fetchDataCallback();
      // Show notification for auto-refresh
      setShowAutoRefreshNotif(true);
      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowAutoRefreshNotif(false);
      }, 3000);
      // Reset the timer after refresh
      setupRefreshTimer();
    }, DEFAULT_REFRESH_INTERVAL);
    logger.debug(`Auto-refresh timer set for ${DEFAULT_REFRESH_INTERVAL/1000} seconds`);
  }, [fetchDataCallback, DEFAULT_REFRESH_INTERVAL]);

  useEffect(() => {
    setupRefreshTimer();
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [setupRefreshTimer]);

  // Optionally, return the notification state or a manual refresh trigger.
  const manualRefresh = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    await fetchDataCallback(); // Directly call fetchDataCallback
    setupRefreshTimer(); // Reset the timer
  }, [fetchDataCallback, setupRefreshTimer]);

  return { showAutoRefreshNotif, manualRefresh };
}