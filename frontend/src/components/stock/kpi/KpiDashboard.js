/**
 * KpiDashboard component for managing and displaying all KPI groups.
 * 
 * This component serves as the main container for all KPI groups and handles
 * the layout and organization of KPI data.
 */

import React, { useState } from 'react';
import KpiGroup from './KpiGroup';
import { logger } from '../../../utils/logger';

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
const DASHBOARD_PADDING = '16px';
const DASHBOARD_BG_COLOR = 'transparent';
const NO_DATA_COLOR = '#a0a0a0';
const ERROR_COLOR = '#f44336';
const BUTTON_BG_COLOR = '#2a2a2a';
const BUTTON_HOVER_BG_COLOR = '#3a3a3a';
const BUTTON_TEXT_COLOR = '#ffffff';

/**
 * Component to display a comprehensive dashboard of KPIs.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.kpiData - The complete KPI data object from the API
 * @param {boolean} props.isLoading - Whether KPI data is currently loading
 * @param {Function} props.onRefresh - Function to call when refresh is requested
 * @param {Function} props.onKpiClick - Optional click handler for KPI cards
 * @param {Object} props.viewPreferences - Object containing view preferences
 * @returns {JSX.Element} The rendered component
 */
const KpiDashboard = ({ 
  kpiData, 
  isLoading = false, 
  onRefresh = null,
  onKpiClick = null,
  viewPreferences = {}
}) => {
  // Generate a unique instance ID for logging
  const instanceId = React.useRef(`kpi-dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
  
  // Log component mount and unmount
  React.useEffect(() => {
    try {
      log.debug(`KpiDashboard mounted (${instanceId.current})`);
    } catch (e) {
      console.log(`KpiDashboard mounted (${instanceId.current})`);
    }
    
    return () => {
      try {
        log.debug(`KpiDashboard unmounting (${instanceId.current})`);
      } catch (e) {
        console.log(`KpiDashboard unmounting (${instanceId.current})`);
      }
    };
  }, []);
  
  // Handle refresh button click
  const handleRefreshClick = () => {
    if (onRefresh) {
      try {
        log.debug(`Refresh requested (${instanceId.current})`);
      } catch (e) {
        console.log(`Refresh requested (${instanceId.current})`);
      }
      onRefresh();
    }
  };
  
  // Check if there's an error in the data
  const hasError = kpiData?.error;
  
  // Extract groups from the KPI data
  const getKpiGroups = () => {
    if (isLoading || !kpiData || hasError) {
      return null;
    }
    
    // Extract groups from kpiData
    return Object.values(kpiData.data?.kpi_groups || {});
  };
  
  // Determine which groups to display based on preferences
  const getVisibleGroups = () => {
    const groups = getKpiGroups();
    
    if (!groups) {
      return [];
    }
    
    // Filter groups based on viewPreferences
    if (viewPreferences?.visibleGroups && viewPreferences.visibleGroups.length > 0) {
      return groups.filter(group => 
        group && viewPreferences.visibleGroups.includes(group.group)
      );
    }
    
    return groups;
  };
  
  // Render KPI groups or appropriate placeholder
  const renderContent = () => {
    if (isLoading) {
      // Render loading placeholder groups
      return (
        <div className="loading-groups">
          <KpiGroup isLoading={true} />
          <KpiGroup isLoading={true} />
        </div>
      );
    }
    
    if (hasError) {
      // Render error message
      return (
        <div className="error-message">
          <p>Error loading KPI data: {kpiData?.error || 'Unknown error'}</p>
          <button 
            className="retry-button"
            onClick={handleRefreshClick}
          >
            Retry
          </button>
        </div>
      );
    }
    
    const visibleGroups = getVisibleGroups();
    
    if (!visibleGroups || visibleGroups.length === 0) {
      // Render empty state
      return (
        <div className="no-data-message">
          <p>No KPI data available for this ticker.</p>
          {onRefresh && (
            <button 
              className="retry-button"
              onClick={handleRefreshClick}
            >
              Refresh
            </button>
          )}
        </div>
      );
    }
    
    // Render KPI groups
    return visibleGroups.map((group, index) => {
      if (!group) return null;
      
      return (
        <KpiGroup
          key={group.group || `group-${index}`}
          group={group}
          onKpiClick={onKpiClick}
          initiallyExpanded={viewPreferences?.expandedGroups ? 
            viewPreferences.expandedGroups.includes(group.group) : true}
        />
      );
    });
  };
  
  return (
    <div className="kpi-dashboard">
      {/* Dashboard header */}
      <div className="dashboard-header">
        <h2 className="dashboard-title">
          Key Performance Indicators
          {kpiData?.data?.ticker ? ` - ${kpiData.data.ticker}` : ''}
        </h2>
        
        {onRefresh && (
          <button 
            className="refresh-button"
            onClick={handleRefreshClick}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        )}
      </div>
      
      {/* Dashboard content */}
      <div className="dashboard-content">
        {renderContent()}
      </div>
      
      {/* Styled JSX */}
      <style jsx>{`
        .kpi-dashboard {
          width: 100%;
          padding: ${DASHBOARD_PADDING};
          background-color: ${DASHBOARD_BG_COLOR};
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .dashboard-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
        }
        
        .refresh-button, .retry-button {
          background-color: ${BUTTON_BG_COLOR};
          color: ${BUTTON_TEXT_COLOR};
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .refresh-button:hover, .retry-button:hover {
          background-color: ${BUTTON_HOVER_BG_COLOR};
        }
        
        .refresh-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .dashboard-content {
          display: flex;
          flex-direction: column;
        }
        
        .loading-groups, .no-data-message, .error-message {
          width: 100%;
        }
        
        .no-data-message, .error-message {
          text-align: center;
          padding: 32px 16px;
          background-color: #1a1a1a;
          border-radius: 6px;
          margin-bottom: 16px;
        }
        
        .no-data-message p {
          color: ${NO_DATA_COLOR};
          margin-bottom: 16px;
        }
        
        .error-message p {
          color: ${ERROR_COLOR};
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
};

export default KpiDashboard;
