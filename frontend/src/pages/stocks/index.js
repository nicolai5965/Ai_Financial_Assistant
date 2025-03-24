// index.js (Major Changes)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { logger } from '../../utils/logger';
import { checkApiHealth, DEFAULT_TICKER, fetchDashboardData } from '../../services/api/stock';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import MarketHoursWidget from '../../components/stock/MarketHoursWidget';
import CompanyInfoWidget from '../../components/stock/CompanyInfoWidget';
import KpiContainer from '../../components/stock/KpiContainer';
import { debounce } from 'lodash';

// Color constants for styling
const COLORS = {
  HEALTHY: '#4CAF50',
  UNHEALTHY: '#F44336',
  BUTTON_PRIMARY: '#79B6F2',
  BUTTON_HOVER: '#5a9cd9',
  DARK_BLUE: '#0d1b2a',
  SHADOW_BLACK: '#1B1610',
  WHITE: '#fff',
  LIGHT_GRAY: '#f8f8f8'
};

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
  indicatorConfigs: {}
};

// Utility function for safe localStorage operations
const safeLocalStorage = {
  get: (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      logger.error(`Error reading from localStorage [${key}]: ${e.message}`);
      return defaultValue;
    }
  },
  set: (key, value) => {
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
  // Create a unique instance ID for this page component for reliable tracking
  const instanceId = useRef(generateInstanceId());

  // API health status state
  const [apiStatus, setApiStatus] = useState({
    checked: false,
    healthy: false,
    message: API_MESSAGES.CHECKING
  });

  // Chart settings state with localStorage persistence
  const [chartSettings, setChartSettings] = useState(() => {
    return safeLocalStorage.get(CHART_SETTINGS_KEY, DEFAULT_CHART_SETTINGS);
  });

  // Add state for KPI preferences
  const [kpiPreferences, setKpiPreferences] = useState(() => {
    return safeLocalStorage.get(STORAGE_KEY, DEFAULT_PREFERENCES);
  });

  // Add state for dashboard data
  const [dashboardData, setDashboardData] = useState({
    chartData: null,
    kpi_data: null,
    marketHours: null,
    companyInfo: null,
    loading: true,
    error: null
  });

  // Add a new state to track chart error status
  const [chartHasError, setChartHasError] = useState(false);

  // Settings state for loading and error tracking
  const [settingsState, setSettingsState] = useState({
    isLoading: false,
    error: null
  });

  // NEW:  Fetch trigger state
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Debounced save function for chart settings
  const debouncedSaveSettings = useCallback(
    debounce((settings) => {
      safeLocalStorage.set(CHART_SETTINGS_KEY, settings);
    }, 500),
    []
  );

  // Handler for chart settings changes
  const handleChartSettingsChange = useCallback((newSettings) => {
    logger.debug('index.js: Updating chart settings:', newSettings);
    setChartSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      debouncedSaveSettings(updatedSettings);
      return updatedSettings;
    });
  }, [debouncedSaveSettings]);

  // Handler for ticker changes
  const handleTickerChange = useCallback((newTicker) => {
    logger.debug(`index.js: Updating ticker to: ${newTicker}`);
    handleChartSettingsChange({ ticker: newTicker });
    setChartHasError(false);
  }, [handleChartSettingsChange]);

  // NEW:  Handler for manual update
  const handleUpdateClick = useCallback(() => {
    setFetchTrigger(prev => prev + 1);
  }, []);

  // Move fetchData outside useEffect but keep it inside component
  const fetchData = async () => {
    if (!chartSettings.ticker || !apiStatus.healthy) return;

    setDashboardData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchDashboardData({
        ticker: chartSettings.ticker,
        days: chartSettings.daysOfHistory,
        interval: chartSettings.interval,
        indicators: chartSettings.selectedIndicators,
        chartType: chartSettings.chartType,
        indicatorConfigs: chartSettings.indicatorConfigs,
        kpiGroups: kpiPreferences.visibleGroups,
        kpiTimeframe: '1d',
        useCache: true
      });

      if (data.error) {
        setDashboardData(prev => ({
          ...prev,
          loading: false,
          error: data.message
        }));
        setChartHasError(true);
      } else {
        console.log("index.js: Raw data from API:", data);
        setDashboardData(prev => ({
          ...prev,
          chartData: data.chart_data,
          kpi_data: data.kpi_data,
          marketHours: data.market_hours,
          companyInfo: data.company_info,
          loading: false,
          error: null
        }));
        console.log("index.js: Updated dashboardData state:", {
          chartData: data.chart_data,
          kpi_data: data.kpi_data,
          marketHours: data.market_hours,
          companyInfo: data.company_info,
        });
        setChartHasError(false);
      }
    } catch (error) {
      logger.error(`Error fetching dashboard data: ${error.message}`);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      setChartHasError(true);
    }
  };

  const { showAutoRefreshNotif, manualRefresh } = useAutoRefresh(fetchData);

  // Handle preference changes
  const handlePreferencesChange = (newPreferences) => {
    logger.debug(`Updating KPI preferences: ${JSON.stringify(newPreferences)}`);
    setKpiPreferences(newPreferences);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      // No need to call fetchData explicitly - useEffect will handle it
    } catch (e) {
      logger.error(`Error saving KPI preferences: ${e.message}`);
    }
  };

  // Log when page component mounts and unmounts
  useEffect(() => {
    const id = instanceId.current;
    logger.debug(`StocksPage component mounted (instance: ${id})`);

    return () => {
      logger.debug(`StocksPage component unmounting (instance: ${id})`);
    };
  }, []);

  // Check API status on component mount
  useEffect(() => {
    const performApiHealthCheck = async () => {
      const id = instanceId.current;
      logger.info(`Checking API health (instance: ${id})`);

      try {
        // Attempt API health check
        const isHealthy = await checkApiHealth();

        // Update API status based on health check result
        setApiStatus({
          checked: true,
          healthy: isHealthy,
          message: isHealthy ? API_MESSAGES.CONNECTED : API_MESSAGES.FAILED
        });

        logger.info(`API health check complete (instance: ${id}). Status: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      } catch (error) {
        // Handle any errors during health check
        const errorMessage = error?.message || 'Unknown error occurred';
        logger.error(`API health check error (instance: ${id}): ${errorMessage}`);

        setApiStatus({
          checked: true,
          healthy: false,
          message: `API connection error: ${errorMessage}`
        });
      }
    };

    performApiHealthCheck();
  }, []);

  // CHANGED:  useEffect now only depends on fetchTrigger and apiStatus
  useEffect(() => {
     if (apiStatus.healthy) {
        fetchData();
      }
  }, [fetchTrigger, apiStatus.healthy]);

  // Render the connection error component when API is unhealthy
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

  // Render the API status indicator
  const renderApiStatusIndicator = () => (
    <div className={`api-status ${apiStatus.healthy ? 'healthy' : 'unhealthy'}`}>
      <span className="status-indicator"></span>
      <span className="status-text">{apiStatus.message || 'Status unknown'}</span>
    </div>
  );

  return (
    <div className="stocks-page">
      {/* API Status Indicator positioned above the title */}
      {renderApiStatusIndicator()}

      <h1>Stock Market Analysis</h1>
      {/* Auto-refresh notification */}
      {showAutoRefreshNotif && (
        <div className="auto-refresh-notification">
          <div className="notification-icon">🔄</div>
          <div className="notification-text">
            Data automatically refreshed at {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Info widgets container with both Market Hours and Company Info */}
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

      {/* Conditionally render StockChart or connection error based on API health */}
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

      <style jsx>{`
        .stocks-page {
          padding: 20px;
          color: ${COLORS.WHITE};
        }

        h1 {
          margin-bottom: 20px;
          color: ${COLORS.LIGHT_GRAY};
        }

        .info-widgets-container {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 20px;
        }

        /* Responsive styling for smaller screens */
        @media (max-width: 768px) {
          .info-widgets-container {
            flex-direction: column;
          }
        }

        .api-status {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          margin-left: 20px;
          margin-right: 20px;
          margin-top: 20px;
          padding: 10px 15px;
          border-radius: 4px;
          background-color: ${COLORS.DARK_BLUE};
          width: auto;
        }

        .api-status.healthy {
          border-left: 4px solid ${COLORS.HEALTHY};

        }

        .api-status.unhealthy {
          border-left: 4px solid ${COLORS.UNHEALTHY};
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 10px;
        }

        .healthy .status-indicator {
          background-color: ${COLORS.HEALTHY};
          box-shadow: 0 0 8px ${COLORS.HEALTHY};
        }

        .unhealthy .status-indicator {
          background-color: ${COLORS.UNHEALTHY};
          box-shadow: 0 0 8px ${COLORS.UNHEALTHY};
        }

        .connection-error {
          background-color: ${COLORS.SHADOW_BLACK};
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }

        .connection-error code {
          display: block;
          background-color: ${COLORS.DARK_BLUE};
          padding: 10px;
          margin: 10px 0;
          border-radius: 4px;
          font-family: monospace;
        }

        button {
          padding: 10px 15px;
          background-color: ${COLORS.BUTTON_PRIMARY};
          color: ${COLORS.DARK_BLUE};
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 10px;
        }

        button:hover {
          background-color: ${COLORS.BUTTON_HOVER};
        }

        .auto-refresh-notification {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          background-color: rgba(92, 230, 207, 0.2);
          border: 1px solid rgba(92, 230, 207, 0.7);
          border-radius: 4px;
          margin-bottom: 15px;
          color: #fff;
          animation: fadeInOut 3s;
          font-size: 14px;
        }
        .notification-icon {
          margin-right: 10px;
          font-size: 16px;
        }
        @keyframes fadeInOut {
          0% { opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default StocksPage;