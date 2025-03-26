// KpiSettings.js

// ---------------------------------------------------------------------
// Import Statements
// ---------------------------------------------------------------------
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../../../utils/logger'; // Assuming path is correct

// --- Fallback Logger ---
const safeLogger = {
  debug: (message) => console.log(`[DEBUG] ${message}`),
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
};
const log = typeof logger !== 'undefined' ? logger : safeLogger;

// ---------------------------------------------------------------------
// Styling Constants (Adapted from StockSettingsSidebar Theme)
// ---------------------------------------------------------------------

// COLORS - Primary palette
const PRIMARY_DARK = 'rgba(13, 27, 42, 1)';      // Dark blue
const PRIMARY_LIGHT = 'rgba(26, 42, 58, 1)';      // Light blue
const ACCENT_PRIMARY = 'rgba(92, 230, 207, 1)';   // Cyan
const ACCENT_HOVER = 'rgba(59, 205, 186, 1)';     // Darker cyan
const TEXT_PRIMARY = 'rgba(248, 248, 248, 1)';    // White text
const TEXT_SECONDARY = 'rgba(204, 204, 204, 1)';   // Light gray text
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.5)';         // Black shadow

// MODAL STYLING
const MODAL_OVERLAY_BG = 'rgba(28, 36, 44, 0.85)'; // Semi-transparent dark blue overlay
const MODAL_BG_COLOR = PRIMARY_DARK; // Use base dark color for modal background
const MODAL_BORDER = `1px solid rgba(92, 230, 207, 0.3)`; // Accent border, slightly brighter
const MODAL_BORDER_RADIUS = '6px'; // Slightly larger radius for modal
const MODAL_SHADOW = `0 5px 20px ${SHADOW_COLOR}`;
const MODAL_HEADER_BORDER = `1px solid rgba(92, 230, 207, 0.2)`; // Subtle border for sections

// BUTTONS - General styling and specific types
const BUTTON_BORDER_RADIUS = '4px';
const BUTTON_PADDING = '8px 16px';
const BUTTON_FONT_SIZE = '14px';
const BUTTON_TRANSITION = 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease';
const BUTTON_FONT_WEIGHT = 'bold';
const BUTTON_TEXT_TRANSFORM = 'uppercase';
const BUTTON_LETTER_SPACING = '0.5px';

// View selection buttons (Secondary style)
const BUTTON_VIEW_BG = 'rgba(92, 230, 207, 0.15)';
const BUTTON_VIEW_HOVER_BG = 'rgba(92, 230, 207, 0.3)';
const BUTTON_VIEW_ACTIVE_BG = ACCENT_PRIMARY; // Active view uses primary accent
const BUTTON_VIEW_ACTIVE_TEXT = PRIMARY_DARK; // Dark text on active accent

// Footer buttons (Save - Primary, Cancel - Tertiary/Outline)
const BUTTON_SAVE_BG = ACCENT_PRIMARY;
const BUTTON_SAVE_HOVER_BG = ACCENT_HOVER;
const BUTTON_SAVE_TEXT = PRIMARY_DARK;
const BUTTON_CANCEL_BG = 'transparent';
const BUTTON_CANCEL_BORDER = `1px solid rgba(92, 230, 207, 0.4)`;
const BUTTON_CANCEL_HOVER_BG = 'rgba(92, 230, 207, 0.1)';
const BUTTON_CANCEL_TEXT = TEXT_PRIMARY;

// Close button (Top right)
const CLOSE_BUTTON_COLOR = TEXT_SECONDARY;
const CLOSE_BUTTON_HOVER_COLOR = ACCENT_PRIMARY;

// CHECKBOX STYLING - Match sidebar checkbox appearance
const CHECKBOX_SIZE = '18px';
const CHECKBOX_BG = 'rgba(10, 20, 30, 0.7)';
const CHECKBOX_BORDER = 'rgba(92, 230, 207, 0.7)';
const CHECKBOX_CHECKED_BG = ACCENT_PRIMARY; // Use primary accent for checked state
const CHECKBOX_CHECK_COLOR = PRIMARY_DARK; // Dark checkmark for contrast
const CHECKBOX_MARGIN_RIGHT = '10px';

// TEXT & TITLES
const SECTION_TITLE_COLOR = ACCENT_PRIMARY; // Use accent for section titles

// ---------------------------------------------------------------------
// Predefined Views Configuration
// ---------------------------------------------------------------------
const PREDEFINED_VIEWS = {
  technical: { name: 'Technical', groups: ['price', 'volume', 'volatility'] },
  fundamental: { name: 'Fundamental', groups: ['price', 'fundamental'] },
  sentiment: { name: 'Sentiment', groups: ['price', 'sentiment'] },
  all: { name: 'All', groups: ['price', 'volume', 'volatility', 'fundamental', 'sentiment'] },
};

/**
 * Component to manage KPI display preferences in a themed modal.
 * Allows selection of predefined views or custom group visibility.
 */
const KpiSettings = ({
  isVisible,
  onClose,
  availableGroups = [], // Array of available group names (e.g., ['price', 'volume'])
  preferences = {}, // Current preferences { visibleGroups: [], expandedGroups: [], activeView: 'all' }
  onPreferencesChange, // Callback when preferences change internally
  onSaveClick, // Callback when the user explicitly saves
}) => {
  // --- State ---
  // Local state to manage preferences within the modal before saving
  const [currentPreferences, setCurrentPreferences] = useState({
    visibleGroups: preferences.visibleGroups || [],
    expandedGroups: preferences.expandedGroups || [], // Maintain expanded state if needed
    activeView: preferences.activeView || 'all',
  });
  // Ref for unique instance ID for logging
  const instanceId = useRef(`kpi-settings-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);

  // --- Effects ---

  // Sync local state with external preferences when the modal becomes visible
  useEffect(() => {
    if (isVisible) {
      log.debug(`KpiSettings: Syncing internal state with props on visible (${instanceId.current})`);
      setCurrentPreferences({
        visibleGroups: preferences.visibleGroups || [],
        expandedGroups: preferences.expandedGroups || [], // Ensure expandedGroups are also synced
        activeView: preferences.activeView || 'all',
      });
    }
  }, [isVisible, preferences]); // Rerun when visibility or external preferences change

  // Log mount and unmount
  useEffect(() => {
    log.debug(`KpiSettings: Mounted (${instanceId.current})`);
    return () => log.debug(`KpiSettings: Unmounting (${instanceId.current})`);
  }, []);

  // --- Event Handlers ---

  // Handle selecting a predefined view button
  const handleViewSelect = useCallback((viewKey) => {
    const viewConfig = PREDEFINED_VIEWS[viewKey];
    if (viewConfig) {
      log.debug(`KpiSettings: Selected view: ${viewConfig.name} (${instanceId.current})`);
      // Create new preference state based on the selected view
      const newPreferences = {
        ...currentPreferences, // Keep other preferences like expandedGroups
        visibleGroups: [...viewConfig.groups], // Use a copy of the groups array
        activeView: viewKey,
      };
      setCurrentPreferences(newPreferences);
      // Optionally notify parent immediately of the change within the modal
      if (onPreferencesChange) {
        onPreferencesChange(newPreferences);
      }
    }
  }, [currentPreferences, onPreferencesChange]); // Dependencies

  // Handle toggling the visibility of an individual group via checkbox
  const handleGroupToggle = useCallback((groupName) => {
    log.debug(`KpiSettings: Toggling group visibility: ${groupName} (${instanceId.current})`);

    const isCurrentlyVisible = currentPreferences.visibleGroups.includes(groupName);
    let newVisibleGroups;

    if (isCurrentlyVisible) {
      // Remove the group if it was visible
      newVisibleGroups = currentPreferences.visibleGroups.filter(g => g !== groupName);
    } else {
      // Add the group if it was not visible
      newVisibleGroups = [...currentPreferences.visibleGroups, groupName];
      // Ensure added group exists in availableGroups for safety? Maybe not necessary here.
    }

    // Update local state, mark activeView as 'custom' since it no longer matches a predefined view
    const newPreferences = {
      ...currentPreferences,
      visibleGroups: newVisibleGroups,
      activeView: 'custom', // Indicate custom selection
    };
    setCurrentPreferences(newPreferences);
    // Optionally notify parent immediately
    if (onPreferencesChange) {
      onPreferencesChange(newPreferences);
    }
  }, [currentPreferences, onPreferencesChange]); // Dependencies

  // Handle closing the modal (without saving changes made within the modal)
  const handleClose = useCallback(() => {
    log.debug(`KpiSettings: Close requested (${instanceId.current})`);
    if (onClose) {
      onClose();
    }
    // Note: We don't revert `currentPreferences` here; it will be reset by the useEffect
    // when the modal becomes visible again based on the external `preferences` prop.
  }, [onClose]); // Dependency

  // Handle saving the current local preferences and closing the modal
  const handleSave = useCallback(() => {
    log.info(`KpiSettings: Save requested. Saving preferences:`, currentPreferences, `(${instanceId.current})`);
    // Call the explicit save handler provided by the parent
    if (onSaveClick) {
        // Pass the current internal state to the parent to save
        onSaveClick(currentPreferences);
    } else if (onPreferencesChange) {
        // Fallback: If only onPreferencesChange is provided, use that.
        // This implies the parent updates its state immediately on any change.
        log.warn(`KpiSettings: Using onPreferencesChange as fallback for save. Consider providing onSaveClick for explicit save action. (${instanceId.current})`)
        onPreferencesChange(currentPreferences);
    }
    handleClose(); // Close the modal after saving
  }, [currentPreferences, onSaveClick, onPreferencesChange, handleClose]); // Dependencies

  // --- Render ---

  // Don't render anything if the modal is not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div className="settings-overlay" onClick={handleClose}> {/* Close on overlay click */}
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking inside modal */}
        {/* Modal Header */}
        <div className="settings-header">
          <h3 className="settings-title">KPI Display Settings</h3>
          <button className="close-button" onClick={handleClose} title="Close settings">×</button>
        </div>

        {/* Modal Content */}
        <div className="settings-content">
          {/* Predefined Views Section */}
          <div className="settings-section predefined-views">
            <h4 className="section-title">Quick Views</h4>
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

          {/* Group Visibility Section */}
          <div className="settings-section group-toggles">
            <h4 className="section-title">Visible Groups (Custom)</h4>
            <div className="toggle-list">
              {/* Map over available groups passed from parent */}
              {availableGroups.map((groupName) => (
                <label key={groupName} className="toggle-item">
                  {/* Custom styled checkbox */}
                  <div
                    className={`custom-checkbox ${currentPreferences.visibleGroups.includes(groupName) ? 'checked' : ''}`}
                    onClick={(e) => { e.preventDefault(); handleGroupToggle(groupName); }} // Prevent label double-trigger
                    role="checkbox"
                    aria-checked={currentPreferences.visibleGroups.includes(groupName)}
                    tabIndex={0} // Make it focusable
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleGroupToggle(groupName); }} // Keyboard support
                  >
                    {currentPreferences.visibleGroups.includes(groupName) && (
                       <svg className="checkmark" viewBox="0 0 12 10">
                         <polyline points="1.5 6 4.5 9 10.5 3"></polyline>
                       </svg>
                    )}
                  </div>
                   {/* Hidden actual checkbox for semantics/accessibility */}
                   <input
                    type="checkbox"
                    checked={currentPreferences.visibleGroups.includes(groupName)}
                    onChange={() => handleGroupToggle(groupName)} // Let this handle state change
                    style={{ display: 'none' }} // Hide the actual checkbox
                  />
                  <span className="toggle-label">
                    {/* Capitalize group name for display */}
                    {groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                  </span>
                </label>
              ))}
            </div>
             {availableGroups.length === 0 && (
                 <p className="no-groups-message">No KPI groups available to configure.</p>
             )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="settings-footer">
          <button className="cancel-button footer-button" onClick={handleClose}>
            Cancel
          </button>
          <button className="save-button footer-button" onClick={handleSave}>
            Save & Close
          </button>
        </div>
      </div>

      {/* --- Styles (using theme constants) --- */}
      <style jsx>{`
        .settings-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: ${MODAL_OVERLAY_BG};
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1050; /* Ensure it's above other potential overlays */
          backdrop-filter: blur(3px); /* Optional: Add blur effect */
        }

        .settings-modal {
          background-color: ${MODAL_BG_COLOR};
          border-radius: ${MODAL_BORDER_RADIUS};
          border: ${MODAL_BORDER};
          width: 450px; /* Slightly wider */
          max-width: 90vw;
          max-height: 85vh; /* Slightly less height */
          display: flex;
          flex-direction: column;
          overflow: hidden; /* Prevent content overflow */
          box-shadow: ${MODAL_SHADOW};
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px; /* More padding */
          border-bottom: ${MODAL_HEADER_BORDER};
          flex-shrink: 0; /* Prevent header from shrinking */
        }

        .settings-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: ${TEXT_PRIMARY};
          letter-spacing: 0.5px;
        }

        .close-button {
          background: none;
          border: none;
          color: ${CLOSE_BUTTON_COLOR};
          font-size: 28px; /* Larger close icon */
          font-weight: 300;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: color 0.2s ease, transform 0.2s ease;
        }

        .close-button:hover {
          color: ${CLOSE_BUTTON_HOVER_COLOR};
          transform: rotate(90deg);
        }

        .settings-content {
          padding: 20px;
          overflow-y: auto; /* Allow content scrolling */
          flex: 1; /* Allow content to grow */
          scrollbar-width: thin; /* Firefox */
          scrollbar-color: ${ACCENT_PRIMARY} rgba(0, 0, 0, 0.2); /* Firefox */
        }
        /* Webkit scrollbar styles */
        .settings-content::-webkit-scrollbar {
          width: 8px;
        }
        .settings-content::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .settings-content::-webkit-scrollbar-thumb {
          background-color: ${ACCENT_PRIMARY};
          border-radius: 4px;
        }

        .settings-section {
           margin-bottom: 24px; /* Increased spacing between sections */
        }

        .section-title {
          margin: 0 0 12px;
          font-size: 14px;
          font-weight: bold;
          color: ${SECTION_TITLE_COLOR};
          text-transform: uppercase;
          letter-spacing: 0.8px;
          border-bottom: 1px solid rgba(92, 230, 207, 0.2);
          padding-bottom: 6px;
        }

        /* View Buttons */
        .view-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px; /* Increased gap */
        }

        .view-button {
          background-color: ${BUTTON_VIEW_BG};
          color: ${TEXT_PRIMARY};
          border: 1px solid transparent; /* Add border for alignment */
          border-radius: ${BUTTON_BORDER_RADIUS};
          padding: ${BUTTON_PADDING};
          cursor: pointer;
          font-size: ${BUTTON_FONT_SIZE};
          font-weight: ${BUTTON_FONT_WEIGHT};
          transition: ${BUTTON_TRANSITION};
        }

        .view-button:hover {
          background-color: ${BUTTON_VIEW_HOVER_BG};
          border-color: rgba(92, 230, 207, 0.3);
          transform: translateY(-1px);
        }

        .view-button.active {
          background-color: ${BUTTON_VIEW_ACTIVE_BG};
          color: ${BUTTON_VIEW_ACTIVE_TEXT};
          border-color: ${BUTTON_VIEW_ACTIVE_BG};
          font-weight: bold;
          box-shadow: 0 0 8px rgba(92, 230, 207, 0.5);
        }

        /* Group Toggles */
        .toggle-list {
          display: flex;
          flex-direction: column;
          gap: 12px; /* Increased gap */
        }

        .toggle-item {
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 4px 0; /* Add some vertical padding */
        }

        /* Custom Checkbox Styling */
        .custom-checkbox {
            width: ${CHECKBOX_SIZE};
            height: ${CHECKBOX_SIZE};
            background-color: ${CHECKBOX_BG};
            border: 1px solid ${CHECKBOX_BORDER};
            border-radius: 3px;
            margin-right: ${CHECKBOX_MARGIN_RIGHT};
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background-color 0.2s ease, border-color 0.2s ease;
            flex-shrink: 0; /* Prevent shrinking */
        }

        .custom-checkbox:hover {
            border-color: ${ACCENT_PRIMARY};
        }

        .custom-checkbox.checked {
            background-color: ${CHECKBOX_CHECKED_BG};
            border-color: ${CHECKBOX_CHECKED_BG};
        }

        .checkmark {
            width: calc(${CHECKBOX_SIZE} * 0.6);
            height: calc(${CHECKBOX_SIZE} * 0.6);
            stroke: ${CHECKBOX_CHECK_COLOR};
            stroke-width: 2.5;
            fill: none;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .toggle-label {
          color: ${TEXT_PRIMARY};
          font-size: 14px;
          user-select: none; /* Prevent text selection on click */
        }

        .no-groups-message {
            color: ${TEXT_SECONDARY};
            font-style: italic;
            font-size: 14px;
            margin-top: 10px;
        }

        /* Footer */
        .settings-footer {
          padding: 16px 20px; /* Match header padding */
          display: flex;
          justify-content: flex-end;
          gap: 12px; /* Increased gap */
          border-top: ${MODAL_HEADER_BORDER};
          background-color: rgba(0, 0, 0, 0.2); /* Subtle background */
          flex-shrink: 0; /* Prevent footer from shrinking */
        }

        .footer-button { /* Base style for footer buttons */
          padding: ${BUTTON_PADDING};
          border-radius: ${BUTTON_BORDER_RADIUS};
          font-size: ${BUTTON_FONT_SIZE};
          font-weight: ${BUTTON_FONT_WEIGHT};
          cursor: pointer;
          transition: ${BUTTON_TRANSITION};
          text-transform: ${BUTTON_TEXT_TRANSFORM};
          letter-spacing: ${BUTTON_LETTER_SPACING};
        }
         .footer-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 5px ${SHADOW_COLOR};
         }
         .footer-button:active {
            transform: translateY(0px);
            box-shadow: 0 1px 3px ${SHADOW_COLOR};
         }

        .cancel-button {
          background-color: ${BUTTON_CANCEL_BG};
          color: ${BUTTON_CANCEL_TEXT};
          border: ${BUTTON_CANCEL_BORDER};
        }
        .cancel-button:hover {
          background-color: ${BUTTON_CANCEL_HOVER_BG};
          border-color: ${ACCENT_PRIMARY};
        }

        .save-button {
          background-color: ${BUTTON_SAVE_BG};
          color: ${BUTTON_SAVE_TEXT};
          border: none;
        }
        .save-button:hover {
          background-color: ${BUTTON_SAVE_HOVER_BG};
        }
      `}</style>
    </div>
  );
};

// Ensure display name for easier debugging
KpiSettings.displayName = 'KpiSettings';

export default KpiSettings;