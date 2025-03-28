// index.js (Complete File)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { logger } from '../../utils/logger';
import { checkApiHealth, DEFAULT_TICKER, fetchDashboardData } from '../../services/api/stock';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import MarketHoursWidget from '../../components/stock/MarketHoursWidget';
import CompanyInfoWidget from '../../components/stock/CompanyInfoWidget';
import KpiContainer from '../../components/stock/KpiContainer';
import { debounce } from 'lodash';

// --- Configuration Constants ---

// Color constants for styling
const COLORS = {
  HEALTHY: 'rgba(76, 175, 80, 1)',      // Success/healthy status indicators
  UNHEALTHY: 'rgba(244, 67, 54, 1)',    // Error/unhealthy status indicators
  BUTTON_PRIMARY: 'rgba(121, 182, 242, 1)', // Primary button background color
  BUTTON_HOVER: 'rgba(90, 156, 217, 1)', // Button hover state color
  DARK_BLUE: 'rgba(13, 27, 42, 1)',     // Main background color for dark theme
  SHADOW_BLACK: 'rgba(27, 22, 16, 1)',  // Shadow color for depth effects
  WHITE: 'rgba(255, 255, 255, 1)',      // Primary text and light elements
  LIGHT_GRAY: 'rgba(248, 248, 248, 1)', // Secondary text and subtle highlights
  SECTION_BG_COLOR: 'rgba(10, 20, 30, 0.6)',      // Background for section containers
  SECTION_BORDER_COLOR: 'rgba(92, 230, 207, 0.2)', // Border color for sections
  SECTION_SHADOW_COLOR: 'rgba(0, 0, 0, 0.2)',      // Shadow for section depth
  ACCENT_PRIMARY: 'rgba(92, 230, 207, 1)',         // Primary accent for highlights
};

// Layout Configuration
const OUTER_HORIZONTAL_PADDING_PERCENT = 0; // Percentage space OUTSIDE content on left/right. Set to 0 to allow content to touch edges (if screen is narrow).
const MAX_CONTENT_WIDTH_PX = 2000;         // Max width the actual content block can reach.
const TOP_BOTTOM_PADDING_PX = 20;          // Vertical padding for the page.
const TOP_BOTTOM_PADDING_MOBILE_PX = 15;   // Vertical padding for mobile.

// API status message constants
const API_MESSAGES = {
  CHECKING: 'Checking API status...',
  CONNECTED: 'API is connected and ready',
  FAILED: 'API connection failed. Please ensure the backend server is running.'
};

// Storage keys for preferences and settings
const STORAGE_KEY = 'kpi_dashboard_preferences';
const CHART_SETTINGS_KEY = 'stock_chart_settings';

// Default preferences for KPI dashboard
const DEFAULT_PREFERENCES = {
  visibleGroups: ['price', 'volume', 'volatility', 'fundamental'],
  expandedGroups: ['price', 'volume', 'volatility', 'fundamental'],
  activeView: 'technical'
};

// Default settings for stock chart
const DEFAULT_CHART_SETTINGS = {
  ticker: DEFAULT_TICKER,
  daysOfHistory: 10,
  interval: '1d',
  chartType: 'candlestick',
  selectedIndicators: [],
};

// --- End of Configuration Constants ---


// Utility function for safe localStorage operations
const safeLocalStorage = {
  get: (key, defaultValue) => {
    if (typeof window === 'undefined') { // Check if running on server
      return defaultValue;
    }
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      logger.error(`Error reading from localStorage [${key}]: ${e.message}`);
      return defaultValue;
    }
  },
  set: (key, value) => {
    if (typeof window === 'undefined') { // Check if running on server
      return false;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      logger.error(`Error writing to localStorage [${key}]: ${e.message}`);
      return false;
    }
  }
};

/**
 * Generates a simple unique ID for component instance tracking
 * @returns {string} A unique identifier string
 */
const generateInstanceId = () => {
  return 'page-' + Math.random().toString(36).substring(2, 9);
};

// Dynamically import the StockChart component with SSR disabled
const StockChart = dynamic(() => import('../../components/stock/StockChart'), {
  ssr: false,
  loading: () => <p>Loading Stock Analysis Tool...</p>
});

/**
 * Stock Market Analysis page component
 * Provides stock chart analysis functionality with API health check
 */
const StocksPage = () => {
  // --- State Hooks ---
  const instanceId = useRef(generateInstanceId());
  const [apiStatus, setApiStatus] = useState({
    checked: false,
    healthy: false,
    message: API_MESSAGES.CHECKING
  });

  const [chartSettings, setChartSettings] = useState(() => {
    return safeLocalStorage.get(CHART_SETTINGS_KEY, DEFAULT_CHART_SETTINGS);
  });

  const [kpiPreferences, setKpiPreferences] = useState(() => {
    return safeLocalStorage.get(STORAGE_KEY, DEFAULT_PREFERENCES);
  });

  const [dashboardData, setDashboardData] = useState({
    chartData: null,
    kpi_data: null,
    marketHours: null,
    companyInfo: null,
    loading: true,
    error: null
  });

  const [chartHasError, setChartHasError] = useState(false);

  const [fetchTrigger, setFetchTrigger] = useState(0);

  // --- Callbacks ---
  const debouncedSaveSettings = useCallback(
    debounce((settings) => {
      safeLocalStorage.set(CHART_SETTINGS_KEY, settings);
    }, 500),
    []
  );

  const handleChartSettingsChange = useCallback((newSettings) => {
    logger.debug('index.js: Updating chart settings:', newSettings);
    setChartSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      debouncedSaveSettings(updatedSettings);
      return updatedSettings;
    });
  }, [debouncedSaveSettings]);

  const handleTickerChange = useCallback((newTicker) => {
    logger.debug(`index.js: Updating ticker to: ${newTicker}`);
    handleChartSettingsChange({ ticker: newTicker });
    setChartHasError(false);
    // Trigger data fetch immediately on ticker change
    setFetchTrigger(prev => prev + 1);
  }, [handleChartSettingsChange]);

  const handleUpdateClick = useCallback(() => {
    setFetchTrigger(prev => prev + 1);
  }, []);

  const fetchData = async () => {
    if (!chartSettings.ticker || !apiStatus.healthy) return;

    // Build the request payload for fetching dashboard data.
    const requestPayload = {
      ticker: chartSettings.ticker,
      days: chartSettings.daysOfHistory,
      interval: chartSettings.interval,
      indicators: chartSettings.selectedIndicators,
      chartType: chartSettings.chartType,
      kpiGroups: kpiPreferences.visibleGroups,
      kpiTimeframe: '1d',
      useCache: true
    };

    logger.debug('[SEARCH-FILTER] Sending request payload to backend:', requestPayload);
    setDashboardData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchDashboardData(requestPayload);
      logger.debug('[SEARCH-FILTER] Fetched data from backend:', data);

      if (data.error) {
        setDashboardData(prev => ({
          ...prev,
          loading: false,
          error: data.message
        }));
        setChartHasError(true);
      } else {
        setDashboardData(prev => ({
          ...prev,
          chartData: data.chart_data,
          kpi_data: data.kpi_data,
          marketHours: data.market_hours,
          companyInfo: data.company_info,
          loading: false,
          error: null
        }));
        logger.debug('[SEARCH-FILTER] Updated dashboardData state.');
        setChartHasError(false);
      }
    } catch (error) {
      logger.error(`[SEARCH-FILTER] Error fetching dashboard data: ${error.message}`);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      setChartHasError(true);
    }
  };

  const { showAutoRefreshNotif } = useAutoRefresh(fetchData);

  const handlePreferencesChange = (newPreferences) => {
    logger.debug(`Updating KPI preferences: ${JSON.stringify(newPreferences)}`);
    setKpiPreferences(newPreferences);
    safeLocalStorage.set(STORAGE_KEY, newPreferences);
    // Trigger data fetch only if visible KPI groups changed
    if (JSON.stringify(newPreferences.visibleGroups) !== JSON.stringify(kpiPreferences.visibleGroups)) {
      setFetchTrigger(prev => prev + 1);
    }
  };

  // --- Effects ---
  useEffect(() => {
    const id = instanceId.current;
    logger.debug(`StocksPage component mounted (instance: ${id})`);
    return () => logger.debug(`StocksPage component unmounting (instance: ${id})`);
  }, []);

  useEffect(() => {
    const performApiHealthCheck = async () => {
      const id = instanceId.current;
      logger.info(`Checking API health (instance: ${id})`);
      try {
        const isHealthy = await checkApiHealth();
        setApiStatus({ checked: true, healthy: isHealthy, message: isHealthy ? API_MESSAGES.CONNECTED : API_MESSAGES.FAILED });
        logger.info(`API health check complete (instance: ${id}). Status: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      } catch (error) {
        const errorMessage = error?.message || 'Unknown error occurred';
        logger.error(`API health check error (instance: ${id}): ${errorMessage}`);
        setApiStatus({ checked: true, healthy: false, message: `API connection error: ${errorMessage}` });
      }
    };
    performApiHealthCheck();
  }, []);

  useEffect(() => {
     if (apiStatus.healthy) {
        fetchData();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTrigger, apiStatus.healthy]); // Dependencies are correct


  // --- Render Helpers ---
  const renderConnectionError = () => (
    <div className="connection-error">
       <h3>Cannot connect to the analysis service</h3>
      <p>
        Please ensure the backend server is running by executing:
        <code>python start_api_server.py</code> in the backend directory.
      </p>
      {apiStatus.checked && (
        <button onClick={() => window.location.reload()}>
          Retry Connection
        </button>
      )}
    </div>
  );

  // Optional: Render API status indicator
  const renderApiStatusIndicator = () => (
     <div className={`api-status ${apiStatus.healthy ? 'healthy' : 'unhealthy'}`}>
       <span className="status-indicator"></span>
       <span className="status-text">{apiStatus.message || 'Status unknown'}</span>
     </div>
   );

  // --- Component Return ---
  return (
    <div className="stocks-page">
      <div className="content-wrapper">
        {/* Optional: API Status Indicator positioned above the title */}
        {/* renderApiStatusIndicator() */}

        <div className="header-container">
          <h1>Stock Market Analysis</h1>
        </div>

        {showAutoRefreshNotif && (
          <div className="auto-refresh-notification">
            <div className="notification-icon">🔄</div>
            <div className="notification-text">
              Data automatically refreshed at {new Date().toLocaleTimeString()}
            </div>
          </div>
        )}

        {apiStatus.healthy && chartSettings.ticker && !chartHasError && (
          <div className="info-widgets-container">
            {dashboardData.marketHours && !dashboardData.error && (
              <MarketHoursWidget data={dashboardData.marketHours} />
            )}
            {dashboardData.companyInfo && !dashboardData.error && (
              <CompanyInfoWidget data={dashboardData.companyInfo} />
            )}
          </div>
        )}

        {apiStatus.healthy ? (
          <>
            <StockChart
              settings={chartSettings}
              onSettingsChange={handleChartSettingsChange}
              onTickerChange={handleTickerChange}
              onErrorChange={setChartHasError}
              chartData={dashboardData.chartData}
              loading={dashboardData.loading}
              error={dashboardData.error}
              dashboardData={dashboardData}
              onUpdateClick={handleUpdateClick}
            />
            <KpiContainer
              ticker={chartSettings.ticker}
              dashboardData={dashboardData}
              isLoading={dashboardData.loading}
              error={dashboardData.error}
              preferences={kpiPreferences}
              onPreferencesChange={handlePreferencesChange}
              onSaveClick={handleUpdateClick}
            />
          </>
        ) : (
          renderConnectionError()
        )}
      </div> {/* End of content-wrapper */}

      <style jsx>{`
        /* Ensure border-box sizing globally or at least on key layout elements */
        .stocks-page,
        .content-wrapper,
        .header-container,
        .info-widgets-container > div { /* Apply to children of widget container */
            box-sizing: border-box;
        }

        .stocks-page {
          /* Outer container: Sets viewport padding */
          padding: ${TOP_BOTTOM_PADDING_PX}px ${OUTER_HORIZONTAL_PADDING_PERCENT}%;
          color: ${COLORS.WHITE};
          min-height: 100vh;
          /* background-color: ${COLORS.DARK_BLUE}; /* Optional global background */
        }

        .content-wrapper {
           /* Inner container: Limits content width and centers it */
           max-width: ${MAX_CONTENT_WIDTH_PX}px;
           margin-left: auto;
           margin-right: auto;
        }

        /* --- Header and Widget Styles --- */

        .header-container {
          background-color: ${COLORS.SECTION_BG_COLOR};
          border: 1px solid ${COLORS.SECTION_BORDER_COLOR};
          box-shadow: 0 2px 10px ${COLORS.SECTION_SHADOW_COLOR};
          border-radius: 8px;
          padding: 15px 20px;
          margin-bottom: 25px;
          text-align: center;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
        }

        .header-container h1 {
          margin: 0;
          color: ${COLORS.LIGHT_GRAY};
          font-size: 2.2em;
          font-weight: 600;
          text-shadow: 0 0 8px rgba(92, 230, 207, 0.3);
        }

        .info-widgets-container {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 25px;
          justify-content: center; /* Center widgets if they don't fill the row */
        }

        /* --- Responsive Styling --- */
        /* Optional: Adjust padding when content hits max-width */
        /* @media (min-width: ${MAX_CONTENT_WIDTH_PX}px) { */
            /* Example: Ensure minimum pixel padding if percentage becomes too small */
             /* .stocks-page { */
                 /* padding-left: max(20px, ${OUTER_HORIZONTAL_PADDING_PERCENT}%); */
                 /* padding-right: max(20px, ${OUTER_HORIZONTAL_PADDING_PERCENT}%); */
             /* } */
        /* } */

        @media (max-width: 768px) {
           .stocks-page {
             /* Adjust vertical padding on smaller screens */
             padding-top: ${TOP_BOTTOM_PADDING_MOBILE_PX}px;
             padding-bottom: ${TOP_BOTTOM_PADDING_MOBILE_PX}px;
             /* Horizontal percentage padding remains responsive */
           }
           .header-container h1 {
             font-size: 1.8em; /* Smaller title */
           }
           .info-widgets-container {
             gap: 15px; /* Reduce gap */
           }
        }


        /* --- API Status Styles (Optional) --- */
        .api-status {
          display: flex;
          align-items: center;
          margin-bottom: 20px; /* If uncommented, space below */
          padding: 10px 15px;
          border-radius: 4px;
          background-color: ${COLORS.DARK_BLUE}; /* Match theme */
          border-left: 5px solid; /* Placeholder for color */
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        .api-status.healthy {
          border-left-color: ${COLORS.HEALTHY};
        }
        .api-status.unhealthy {
          border-left-color: ${COLORS.UNHEALTHY};
        }
        .status-indicator {
          width: 12px; height: 12px; border-radius: 50%;
          margin-right: 10px; flex-shrink: 0;
        }
        .healthy .status-indicator {
          background-color: ${COLORS.HEALTHY};
          box-shadow: 0 0 8px ${COLORS.HEALTHY};
        }
        .unhealthy .status-indicator {
          background-color: ${COLORS.UNHEALTHY};
          box-shadow: 0 0 8px ${COLORS.UNHEALTHY};
        }
        .status-text {
          font-size: 0.9em; color: ${COLORS.LIGHT_GRAY};
        }


        /* --- Connection Error Styles --- */
        .connection-error {
          background-color: rgba(244, 67, 54, 0.1); /* Red tint */
          border: 1px solid ${COLORS.UNHEALTHY};
          color: ${COLORS.LIGHT_GRAY};
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px; /* Space from potential elements above */
          text-align: center;
        }
        .connection-error h3 {
          color: ${COLORS.UNHEALTHY};
          margin-top: 0;
          margin-bottom: 10px;
        }
        .connection-error p {
          margin-bottom: 15px;
        }
        .connection-error code {
            display: inline-block; /* Allows padding and margins */
            background-color: ${COLORS.DARK_BLUE};
            padding: 5px 10px;
            margin: 5px 5px; /* Spacing around code block */
            border-radius: 4px;
            font-family: monospace;
            color: ${COLORS.ACCENT_PRIMARY}; /* Use accent for visibility */
            word-break: break-all; /* Prevent long lines breaking layout */
        }

        /* --- General Button Style --- */
        button {
          padding: 10px 15px;
          background-color: ${COLORS.BUTTON_PRIMARY};
          color: ${COLORS.DARK_BLUE}; /* High contrast text */
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 10px; /* Space when needed */
          transition: background-color 0.2s ease;
        }
        button:hover {
          background-color: ${COLORS.BUTTON_HOVER};
        }

        /* --- Auto Refresh Notification Style --- */
        .auto-refresh-notification {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          background-color: rgba(92, 230, 207, 0.15); /* Subtle accent */
          border: 1px solid rgba(92, 230, 207, 0.4);
          border-radius: 4px;
          margin-bottom: 20px; /* Space below notification */
          color: ${COLORS.LIGHT_GRAY};
          animation: fadeInOut 4s ease-in-out forwards; /* Use forwards to stay invisible */
          font-size: 14px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        .notification-icon {
          margin-right: 10px;
          font-size: 16px;
          color: ${COLORS.ACCENT_PRIMARY}; /* Accent color icon */
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }

      `}</style>
    </div> // End of stocks-page
  );
};

export default StocksPage;