/**
 * KpiContainer component for integrating the KPI dashboard into the stock analysis page.
 * 
 * This component serves as the main integration point for the KPI functionality,
 * handling UI state and preferences while receiving data from the parent component.
 */

import React, { useState, useEffect } from 'react';
import KpiDashboard from './kpi/KpiDashboard';
import KpiSettings from './kpi/KpiSettings';
import { DEFAULT_KPI_CONFIG } from '../../services/api/stock';
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
  visibleGroups: DEFAULT_KPI_CONFIG.groups,
  expandedGroups: DEFAULT_KPI_CONFIG.groups,
  activeView: 'technical'
};

/**
 * Component to integrate the KPI dashboard into the stock analysis page.
 * 
 * @param {Object} props - Component properties
 * @param {string} props.ticker - The stock ticker symbol
 * @param {Function} props.onTickerChange - Function to call when ticker changes
 * @param {Object} props.dashboardData - KPI data from parent component
 * @param {boolean} props.isLoading - Loading state from parent
 * @param {string} props.error - Error state from parent
 * @param {Object} props.preferences - Current preferences for the KPI dashboard
 * @param {Function} props.onPreferencesChange - Callback when preferences change
 * @returns {JSX.Element} The rendered component
 */
const KpiContainer = ({ 
  ticker, 
  onTickerChange, 
  dashboardData,
  isLoading,
  error,
  preferences,
  onPreferencesChange
}) => {
  // Add logging to verify the ticker
  console.log("KpiContainer: Data :", dashboardData);
  // State for UI
  const [isVisible, setIsVisible] = useState(true);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  
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
  
  // Handle preference changes
  const handlePreferencesChange = (newPreferences) => {
    if (!newPreferences) return;
    
    try {
      log.debug(`Preferences updated (${instanceId.current})`);
    } catch (e) {
      console.log(`Preferences updated (${instanceId.current})`);
    }
    
    onPreferencesChange(newPreferences);
  };
  
  // Handle KPI click events
  const handleKpiClick = (kpi) => {
    if (!kpi) return;
    
    try {
      log.debug(`KPI clicked: ${kpi.name} (${instanceId.current})`);
    } catch (e) {
      console.log(`KPI clicked: ${kpi.name} (${instanceId.current})`);
    }
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
  
  // Get available KPI groups from the dashboard data
  const getAvailableGroups = () => {
    if (dashboardData?.kpi_data?.available_groups) {
      return dashboardData.kpi_data.available_groups;
    }
    return DEFAULT_KPI_CONFIG.groups;
  };
  
  // Prepare KPI data for display
  const prepareKpiDataForDisplay = () => {
    if (error) {
      console.log("KpiContainer: prepareKpiDataForDisplay: Error state:", error);
      return { error };
    }
    useEffect(() => {
      console.log("KpiContainer: Updated dashboardData:", dashboardData);
    }, [dashboardData]);
    
    return dashboardData?.kpi_data || null;
  };
  
  return (
    <div className="kpi-container">
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
      
      {isVisible && (
        <div className="dashboard-wrapper">
          <KpiDashboard
            kpiData={prepareKpiDataForDisplay()}
            isLoading={isLoading}
            onKpiClick={handleKpiClick}
            viewPreferences={preferences}
          />
        </div>
      )}
      
      <KpiSettings
        isVisible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
        availableGroups={getAvailableGroups()}
        preferences={preferences || DEFAULT_PREFERENCES}
        onPreferencesChange={handlePreferencesChange}
      />
      
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
