/**
 * KpiSettings component for managing KPI display preferences.
 * 
 * This component allows users to customize which KPI groups are visible and
 * provides predefined views (Technical, Fundamental, Combined).
 */

import React, { useState, useEffect } from 'react';
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
const MODAL_BG_COLOR = '#1a1a1a';
const MODAL_BORDER_COLOR = '#333333';
const TEXT_COLOR = '#ffffff';
const SUBTITLE_COLOR = '#a0a0a0';
const BUTTON_BG_COLOR = '#2a2a2a';
const BUTTON_HOVER_BG_COLOR = '#3a3a3a';
const BUTTON_TEXT_COLOR = '#ffffff';
const BUTTON_ACTIVE_BG_COLOR = '#0d4a8c';
const CHECKBOX_ACCENT_COLOR = '#0d6efd';
const BORDER_RADIUS = '6px';

// Predefined views
const PREDEFINED_VIEWS = {
  technical: {
    name: 'Technical',
    groups: ['price', 'volume', 'volatility']
  },
  fundamental: {
    name: 'Fundamental',
    groups: ['price', 'fundamental']
  },
  sentiment: {
    name: 'Sentiment',
    groups: ['price', 'sentiment']
  },
  all: {
    name: 'All',
    groups: ['price', 'volume', 'volatility', 'fundamental', 'sentiment']
  }
};

/**
 * Component to manage KPI display preferences.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isVisible - Whether the settings modal is visible
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @param {Object} props.availableGroups - Available KPI groups from the API
 * @param {Object} props.preferences - Current preferences object
 * @param {Function} props.onPreferencesChange - Function to call when preferences change
 * @returns {JSX.Element|null} The rendered component or null if not visible
 */
const KpiSettings = ({ 
  isVisible, 
  onClose, 
  availableGroups = [], 
  preferences = {}, 
  onPreferencesChange,
  onSaveClick
}) => {
  // Current preferences state
  const [currentPreferences, setCurrentPreferences] = useState({
    visibleGroups: preferences.visibleGroups || [],
    expandedGroups: preferences.expandedGroups || [],
    activeView: preferences.activeView || 'all'
  });
  
  // Generate a unique instance ID for logging
  const instanceId = React.useRef(`kpi-settings-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
  
  // Update local state when preferences prop changes
  useEffect(() => {
    if (isVisible) {
      // Only update when visible to prevent unnecessary re-renders
      setCurrentPreferences({
        visibleGroups: preferences.visibleGroups || [],
        expandedGroups: preferences.expandedGroups || [],
        activeView: preferences.activeView || 'all'
      });
    }
  }, [isVisible, preferences]);
  
  // Log component mount and unmount
  useEffect(() => {
    try {
      log.debug(`KpiSettings: KpiSettings mounted (${instanceId.current})`);
    } catch (e) {
      console.log(`KpiSettings: KpiSettings mounted (${instanceId.current})`);
    }
    
    return () => {
      try {
        log.debug(`KpiSettings: KpiSettings unmounting (${instanceId.current})`);
      } catch (e) {
        console.log(`KpiSettings: KpiSettings unmounting (${instanceId.current})`);
      }
    };
  }, []);
  
  // If not visible, don't render
  if (!isVisible) {
    return null;
  }
  
  // Handle predefined view selection
  const handleViewSelect = (viewKey) => {
    const viewConfig = PREDEFINED_VIEWS[viewKey];
    
    if (viewConfig) {
      try {
        log.debug(`KpiSettings: Selected view: ${viewConfig.name} (${instanceId.current})`);
      } catch (e) {
        console.log(`KpiSettings: Selected view: ${viewConfig.name} (${instanceId.current})`);
      }
      
      // Update preferences
      const newPreferences = {
        ...currentPreferences,
        visibleGroups: viewConfig.groups,
        activeView: viewKey
      };
      
      setCurrentPreferences(newPreferences);
      
      // Notify parent component
      if (onPreferencesChange) {
        onPreferencesChange(newPreferences);
      }
    }
  };
  
  // Handle individual group visibility toggle
  const handleGroupToggle = (group) => {
    try {
      log.debug(`KpiSettings: Toggling group visibility: ${group} (${instanceId.current})`);
    } catch (e) {
      console.log(`KpiSettings: Toggling group visibility: ${group} (${instanceId.current})`);
    }
    
    // Check if group is currently visible
    const isCurrentlyVisible = currentPreferences.visibleGroups.includes(group);
    
    // Update visible groups
    let newVisibleGroups;
    if (isCurrentlyVisible) {
      // Remove group
      newVisibleGroups = currentPreferences.visibleGroups.filter(g => g !== group);
    } else {
      // Add group
      newVisibleGroups = [...currentPreferences.visibleGroups, group];
    }
    
    // Update preferences
    const newPreferences = {
      ...currentPreferences,
      visibleGroups: newVisibleGroups,
      // Clear activeView if custom selection
      activeView: 'custom'
    };
    
    setCurrentPreferences(newPreferences);
    
    // Notify parent component
    if (onPreferencesChange) {
      onPreferencesChange(newPreferences);
    }
  };
  
  // Close settings modal
  const handleClose = () => {
    try {
      log.debug(`KpiSettings: Closing settings modal (${instanceId.current})`);
    } catch (e) {
      console.log(`KpiSettings: Closing settings modal (${instanceId.current})`);
    }
    
    if (onClose) {
      onClose();
    }
  };
  
  // Save current preferences
  const handleSave = () => {
    try {
      log.debug(`KpiSettings: Saving preferences (${instanceId.current})`);
    } catch (e) {
      console.log(`KpiSettings: Saving preferences (${instanceId.current})`);
    }
    
    if (onPreferencesChange) {
      onPreferencesChange(currentPreferences);
    }
    if (onSaveClick) {
      onSaveClick();
    }
    handleClose();
  };
  
  // Render the settings modal
  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h3 className="settings-title">KPI Display Settings</h3>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        
        <div className="settings-content">
          {/* Predefined views */}
          <div className="predefined-views">
            <h4 className="section-title">Views</h4>
            <div className="view-buttons">
              {Object.entries(PREDEFINED_VIEWS).map(([key, view]) => (
                <button
                  key={key}
                  className={`view-button ${currentPreferences.activeView === key ? 'active' : ''}`}
                  onClick={() => handleViewSelect(key)}
                >
                  {view.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Group visibility toggles */}
          <div className="group-toggles">
            <h4 className="section-title">Visible Groups</h4>
            <div className="toggle-list">
              {availableGroups.map((group) => (
                <label key={group} className="toggle-item">
                  <input
                    type="checkbox"
                    checked={currentPreferences.visibleGroups.includes(group)}
                    onChange={() => handleGroupToggle(group)}
                  />
                  <span className="toggle-label">
                    {group.charAt(0).toUpperCase() + group.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        <div className="settings-footer">
          <button className="cancel-button" onClick={handleClose}>
            Cancel
          </button>
          <button className="save-button" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
      
      {/* Styled JSX */}
      <style jsx>{`
        .settings-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .settings-modal {
          background-color: ${MODAL_BG_COLOR};
          border-radius: ${BORDER_RADIUS};
          border: 1px solid ${MODAL_BORDER_COLOR};
          width: 400px;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid ${MODAL_BORDER_COLOR};
        }
        
        .settings-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: ${TEXT_COLOR};
        }
        
        .close-button {
          background: none;
          border: none;
          color: ${SUBTITLE_COLOR};
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        
        .close-button:hover {
          color: ${TEXT_COLOR};
        }
        
        .settings-content {
          padding: 16px;
          overflow-y: auto;
          flex: 1;
        }
        
        .section-title {
          margin: 0 0 12px;
          font-size: 14px;
          font-weight: 600;
          color: ${SUBTITLE_COLOR};
        }
        
        .predefined-views {
          margin-bottom: 20px;
        }
        
        .view-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .view-button {
          background-color: ${BUTTON_BG_COLOR};
          color: ${BUTTON_TEXT_COLOR};
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s ease;
        }
        
        .view-button:hover {
          background-color: ${BUTTON_HOVER_BG_COLOR};
        }
        
        .view-button.active {
          background-color: ${BUTTON_ACTIVE_BG_COLOR};
        }
        
        .group-toggles {
          margin-bottom: 20px;
        }
        
        .toggle-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .toggle-item {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        
        .toggle-item input[type="checkbox"] {
          accent-color: ${CHECKBOX_ACCENT_COLOR};
          margin-right: 8px;
        }
        
        .toggle-label {
          color: ${TEXT_COLOR};
          font-size: 14px;
        }
        
        .settings-footer {
          padding: 16px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          border-top: 1px solid ${MODAL_BORDER_COLOR};
        }
        
        .cancel-button, .save-button {
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .cancel-button {
          background-color: transparent;
          color: ${TEXT_COLOR};
          border: 1px solid ${MODAL_BORDER_COLOR};
        }
        
        .cancel-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        .save-button {
          background-color: ${BUTTON_ACTIVE_BG_COLOR};
          color: ${TEXT_COLOR};
          border: none;
        }
        
        .save-button:hover {
          background-color: #0e5aa9;
        }
      `}</style>
    </div>
  );
};

export default KpiSettings;
