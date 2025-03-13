/**
 * KpiContainer component for integrating the KPI dashboard into the stock analysis page.
 * 
 * This component serves as the main integration point for the KPI functionality,
 * handling data fetching, state management, and UI coordination with the stock chart.
 */

import React, { useState, useEffect, useCallback } from 'react';
import KpiDashboard from './kpi/KpiDashboard';
import KpiSettings from './kpi/KpiSettings';
import { fetchStockKpis, checkKpiApiHealth } from '../../services/api/kpi';
import { logger } from '../../utils/logger';

// Fallback logger for development or if the main logger fails
const safeLogger = {
  debug: (message) => console.log(`[DEBUG] ${message}`),
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

// Use the imported logger if available, otherwise use the fallback
const log = typeof logger !== 'undefined' ? logger : safeLogger;

// Constants for styling
const CONTAINER_BG_COLOR = 'transparent';
const BUTTON_BG_COLOR = '#2a2a2a';
const BUTTON_HOVER_BG_COLOR = '#3a3a3a';
const BUTTON_TEXT_COLOR = '#ffffff';
const BORDER_RADIUS = '6px';

// Local storage key for preferences
const STORAGE_KEY = 'kpi_dashboard_preferences';

// Default preferences
const DEFAULT_PREFERENCES = {
  visibleGroups: ['price'],
  expandedGroups: ['price'],
  activeView: 'technical'
};

/**
 * Component to integrate the KPI dashboard into the stock analysis page.
 * 
 * @param {Object} props - Component properties
 * @param {string} props.ticker - The stock ticker symbol
 * @param {Function} props.onTickerChange - Function to call when ticker changes
 * @returns {JSX.Element} The rendered component
 */
const KpiContainer = ({ ticker, onTickerChange }) => {
  // State for KPI data
  const [kpiData, setKpiData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for UI
  const [isApiAvailable, setIsApiAvailable] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  
  // State for preferences
  const [preferences, setPreferences] = useState(() => {
    // Try to load from localStorage
    try {
      const savedPreferences = localStorage.getItem(STORAGE_KEY);
      return savedPreferences ? JSON.parse(savedPreferences) : DEFAULT_PREFERENCES;
    } catch (e) {
      try {
        log.error(`Error loading preferences from localStorage: ${e.message}`);
      } catch (err) {
        console.error(`Error loading preferences from localStorage: ${e.message}`);
      }
      return DEFAULT_PREFERENCES;
    }
  });
  
  // Generate a unique instance ID for logging
  const instanceId = React.useRef(`kpi-container-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
  
  // Log component mount and unmount
  useEffect(() => {
    try {
      log.debug(`KpiContainer mounted (${instanceId.current})`);
    } catch (e) {
      console.log(`KpiContainer mounted (${instanceId.current})`);
    }
    
    return () => {
      try {
        log.debug(`KpiContainer unmounting (${instanceId.current})`);
      } catch (e) {
        console.log(`KpiContainer unmounting (${instanceId.current})`);
      }
    };
  }, []);
  
  // Function to fetch KPI data
  const fetchData = useCallback(async () => {
    if (!ticker || !isApiAvailable) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      try {
        log.info(`Fetching KPI data for ${ticker} (${instanceId.current})`);
      } catch (e) {
        console.log(`Fetching KPI data for ${ticker} (${instanceId.current})`);
      }
      
      const data = await fetchStockKpis(
        ticker, 
        preferences?.visibleGroups || DEFAULT_PREFERENCES.visibleGroups
      );
      
      setKpiData(data);
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      
      try {
        log.error(`Error fetching KPI data: ${err.message} (${instanceId.current})`);
      } catch (e) {
        console.error(`Error fetching KPI data: ${err.message} (${instanceId.current})`);
      }
    }
  }, [ticker, preferences?.visibleGroups, isApiAvailable]);
  
  // Check API availability on mount
  useEffect(() => {
    const checkApiAvailability = async () => {
      try {
        const isAvailable = await checkKpiApiHealth();
        setIsApiAvailable(isAvailable);
        
        if (!isAvailable) {
          try {
            log.warn(`KPI API is not available (${instanceId.current})`);
          } catch (e) {
            console.warn(`KPI API is not available (${instanceId.current})`);
          }
          setError('KPI API is currently unavailable');
        }
      } catch (err) {
        setIsApiAvailable(false);
        setError('Error checking KPI API availability');
        
        try {
          log.error(`Error checking KPI API: ${err.message} (${instanceId.current})`);
        } catch (e) {
          console.error(`Error checking KPI API: ${err.message} (${instanceId.current})`);
        }
      }
    };
    
    checkApiAvailability();
  }, []);
  
  // Fetch data when ticker or preferences change
  useEffect(() => {
    if (ticker) {
      fetchData();
    }
  }, [ticker, fetchData]);
  
  // Save preferences to localStorage when they change
  useEffect(() => {
    if (!preferences) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      
      try {
        log.debug(`Saved preferences to localStorage (${instanceId.current})`);
      } catch (e) {
        console.log(`Saved preferences to localStorage (${instanceId.current})`);
      }
    } catch (e) {
      try {
        log.error(`Error saving preferences to localStorage: ${e.message} (${instanceId.current})`);
      } catch (err) {
        console.error(`Error saving preferences to localStorage: ${e.message} (${instanceId.current})`);
      }
    }
  }, [preferences]);
  
  // Handle preference changes
  const handlePreferencesChange = (newPreferences) => {
    if (!newPreferences) return;
    
    try {
      log.debug(`Preferences updated (${instanceId.current})`);
    } catch (e) {
      console.log(`Preferences updated (${instanceId.current})`);
    }
    
    setPreferences(newPreferences);
  };
  
  // Handle KPI click events
  const handleKpiClick = (kpi) => {
    if (!kpi) return;
    
    try {
      log.debug(`KPI clicked: ${kpi.name} (${instanceId.current})`);
    } catch (e) {
      console.log(`KPI clicked: ${kpi.name} (${instanceId.current})`);
    }
    
    // Add any custom handling for KPI clicks here
  };
  
  // Toggle visibility of the entire dashboard
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
    
    try {
      log.debug(`KPI dashboard visibility toggled to ${!isVisible} (${instanceId.current})`);
    } catch (e) {
      console.log(`KPI dashboard visibility toggled to ${!isVisible} (${instanceId.current})`);
    }
  };
  
  // Toggle settings modal
  const toggleSettings = () => {
    setIsSettingsVisible(!isSettingsVisible);
  };
  
  // Get available KPI groups from the API response
  const getAvailableGroups = () => {
    if (kpiData?.data?.available_groups) {
      return kpiData.data.available_groups;
    }
    
    // Default groups if not available from API
    return ['price', 'volume', 'volatility', 'fundamental', 'sentiment'];
  };
  
  // Prepare KPI data for display, including handling error states
  const prepareKpiDataForDisplay = () => {
    if (error) {
      return { error };
    }
    return kpiData;
  };
  
  return (
    <div className="kpi-container">
      {/* Dashboard visibility toggle */}
      <div className="toggle-container">
        <button className="toggle-button" onClick={toggleVisibility}>
          {isVisible ? 'Hide KPIs' : 'Show KPIs'}
        </button>
        
        {isVisible && (
          <button className="settings-button" onClick={toggleSettings}>
            Settings
          </button>
        )}
      </div>
      
      {/* KPI Dashboard */}
      {isVisible && (
        <div className="dashboard-wrapper">
          <KpiDashboard
            kpiData={prepareKpiDataForDisplay()}
            isLoading={isLoading}
            onRefresh={fetchData}
            onKpiClick={handleKpiClick}
            viewPreferences={preferences || DEFAULT_PREFERENCES}
          />
        </div>
      )}
      
      {/* Settings modal */}
      <KpiSettings
        isVisible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
        availableGroups={getAvailableGroups()}
        preferences={preferences || DEFAULT_PREFERENCES}
        onPreferencesChange={handlePreferencesChange}
      />
      
      {/* Styled JSX */}
      <style jsx>{`
        .kpi-container {
          width: 100%;
          background-color: ${CONTAINER_BG_COLOR};
          padding: 8px 0;
        }
        
        .toggle-container {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          padding: 0 16px;
        }
        
        .toggle-button, .settings-button {
          background-color: ${BUTTON_BG_COLOR};
          color: ${BUTTON_TEXT_COLOR};
          border: none;
          border-radius: ${BORDER_RADIUS};
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .toggle-button:hover, .settings-button:hover {
          background-color: ${BUTTON_HOVER_BG_COLOR};
        }
        
        .dashboard-wrapper {
          width: 100%;
          transition: max-height 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default KpiContainer;
