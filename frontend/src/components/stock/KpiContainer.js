/**
 * KpiContainer component for integrating the KPI dashboard into the stock analysis page.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import KpiDashboard from './kpi/KpiDashboard';
import KpiSettings from './kpi/KpiSettings';
import { DEFAULT_KPI_CONFIG } from '../../services/api/stock';
import { logger } from '../../utils/logger';

const safeLogger = {
  debug: (message) => console.log(`[DEBUG] ${message}`),
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

const log = typeof logger !== 'undefined' ? logger : safeLogger;

const CONTAINER_BG_COLOR = 'transparent';
const BUTTON_BG_COLOR = '#2a2a2a';
const BUTTON_HOVER_BG_COLOR = '#3a3a3a';
const BUTTON_TEXT_COLOR = '#ffffff';
const BORDER_RADIUS = '6px';

const STORAGE_KEY = 'kpi_dashboard_preferences';

const DEFAULT_PREFERENCES = {
  visibleGroups: DEFAULT_KPI_CONFIG.groups,
  expandedGroups: DEFAULT_KPI_CONFIG.groups,
  activeView: 'technical'
};

const KpiContainer = ({
  ticker,
  onTickerChange,
  dashboardData,
  isLoading,
  error,
  preferences,
  onPreferencesChange,
  onSaveClick
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const instanceId = useRef(`kpi-container-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);

  // Mount/Unmount Logging (kept for debugging)
  useEffect(() => {
    log.debug(`KpiContainer: KpiContainer mounted (${instanceId.current})`);
    return () => log.debug(`KpiContainer: KpiContainer unmounting (${instanceId.current})`);
  }, []);

  // Memoized Data Preparation (removed useEffect, using useMemo)
  const displayKpiData = useMemo(() => {
    if (error) {
      console.log("KpiContainer: Error state:", error);
      return { error };
    }
    return dashboardData?.kpi_data || null;
  }, [dashboardData, error]);

  // useCallback for Handlers (stabilizing function references)
  const handlePreferencesChange = useCallback((newPreferences) => {
    if (!newPreferences) return;
    log.debug(`KpiContainer: Preferences updated (${instanceId.current})`);
    onPreferencesChange(newPreferences);
    console.log("KpiContainer: Preferences updated:", newPreferences)
  }, [onPreferencesChange, instanceId]);

  const handleKpiClick = useCallback((kpi) => {
    if (!kpi) return;
    log.debug(`KpiContainer: KPI clicked: ${kpi.name} (${instanceId.current})`);
  }, [instanceId]);

  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev);
    log.debug(`KpiContainer: KPI dashboard visibility toggled to ${!isVisible} (${instanceId.current})`);
  }, [isVisible, instanceId]);

  const toggleSettings = useCallback(() => {
    setIsSettingsVisible(prev => !prev);
  }, []);

  // Memoized available groups
  const getAvailableGroups = useMemo(() => {
    return dashboardData?.kpi_data?.available_groups || DEFAULT_KPI_CONFIG.groups;
  }, [dashboardData]);

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
            kpiData={displayKpiData}
            isLoading={isLoading}
            onKpiClick={handleKpiClick}
            viewPreferences={preferences}
          />
        </div>
      )}

      <KpiSettings
        isVisible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
        availableGroups={getAvailableGroups}
        preferences={preferences || DEFAULT_PREFERENCES}
        onPreferencesChange={handlePreferencesChange}
        onSaveClick={onSaveClick}
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

export default React.memo(KpiContainer);