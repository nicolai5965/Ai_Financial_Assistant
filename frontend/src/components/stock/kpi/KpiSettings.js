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

// ADD/REMOVE/MOVE BUTTONS
const BUTTON_ACTION_BG = 'rgba(92, 230, 207, 0.1)';
const BUTTON_ACTION_HOVER_BG = 'rgba(92, 230, 207, 0.25)';
const BUTTON_ACTION_COLOR = ACCENT_PRIMARY;
const BUTTON_ACTION_DISABLED_COLOR = 'rgba(92, 230, 207, 0.3)';
const BUTTON_MOVE_PADDING = '4px 8px'; // Smaller padding for move buttons
const BUTTON_MOVE_FONT_SIZE = '18px'; // Use icons/arrows

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
  preferences = {}, // Current preferences { visibleGroups: [], expandedGroups: [], activeView: 'all', groupOrder: [] }
  onPreferencesChange, // Callback when preferences change internally
  onSaveClick, // Callback when the user explicitly saves
}) => {
  // --- State ---
  // Local state to manage preferences within the modal before saving
  const [currentPreferences, setCurrentPreferences] = useState({
    visibleGroups: preferences.visibleGroups || [],
    expandedGroups: preferences.expandedGroups || [],
    activeView: preferences.activeView || 'all',
    groupOrder: preferences.groupOrder || [],
  });
  // Ref for unique instance ID for logging
  const instanceId = useRef(`kpi-settings-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);

  // --- Effects ---

  // Sync local state with external preferences when the modal becomes visible
  useEffect(() => {
    if (isVisible) {
      log.debug(`KpiSettings: Syncing internal state with props on visible (${instanceId.current})`);
      // Ensure groupOrder exists in preferences, falling back to availableGroups if needed
      const initialGroupOrder = preferences.groupOrder && preferences.groupOrder.length > 0
         ? preferences.groupOrder
         : (preferences.visibleGroups || []); // Fallback to visibleGroups order if groupOrder is missing

      setCurrentPreferences({
        visibleGroups: preferences.visibleGroups || [],
        expandedGroups: preferences.expandedGroups || [],
        activeView: preferences.activeView || 'custom', // Default to custom if complex state loaded
        // Initialize groupOrder, ensuring it only contains currently visible groups
        groupOrder: initialGroupOrder.filter(group => (preferences.visibleGroups || []).includes(group)),
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
        // Set groupOrder to match the predefined view's order
        groupOrder: [...viewConfig.groups],
      };
      setCurrentPreferences(newPreferences);
      // Optionally notify parent immediately of the change within the modal
      if (onPreferencesChange) {
        onPreferencesChange(newPreferences);
      }
    }
  }, [currentPreferences, onPreferencesChange]); // Dependencies

  // Handle Adding a group from Available to Selected
  const handleAddGroup = useCallback((groupName) => {
      if (!currentPreferences.visibleGroups.includes(groupName)) {
          log.debug(`KpiSettings: Adding group: ${groupName} (${instanceId.current})`);
          const newVisibleGroups = [...currentPreferences.visibleGroups, groupName];
          const newGroupOrder = [...currentPreferences.groupOrder, groupName]; // Add to end of order

          const newPreferences = {
              ...currentPreferences,
              visibleGroups: newVisibleGroups,
              groupOrder: newGroupOrder,
              activeView: 'custom',
          };
          setCurrentPreferences(newPreferences);
          if (onPreferencesChange) {
              onPreferencesChange(newPreferences);
          }
      }
  }, [currentPreferences, onPreferencesChange]);

  // Handle Removing a group from Selected back to Available
  const handleRemoveGroup = useCallback((groupName) => {
      if (currentPreferences.visibleGroups.includes(groupName)) {
          log.debug(`KpiSettings: Removing group: ${groupName} (${instanceId.current})`);
          const newVisibleGroups = currentPreferences.visibleGroups.filter(g => g !== groupName);
          const newGroupOrder = currentPreferences.groupOrder.filter(g => g !== groupName); // Remove from order

          const newPreferences = {
              ...currentPreferences,
              visibleGroups: newVisibleGroups,
              groupOrder: newGroupOrder,
              activeView: 'custom',
          };
          setCurrentPreferences(newPreferences);
          if (onPreferencesChange) {
              onPreferencesChange(newPreferences);
          }
      }
  }, [currentPreferences, onPreferencesChange]);

  // Handle Moving a group Up or Down in the Selected list
  const handleMoveGroup = useCallback((groupName, direction) => {
      const currentIndex = currentPreferences.groupOrder.indexOf(groupName);
      if (currentIndex === -1) return; // Should not happen

      const newOrder = [...currentPreferences.groupOrder];
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      // Check bounds
      if (targetIndex < 0 || targetIndex >= newOrder.length) {
          return; // Cannot move further
      }

      log.debug(`KpiSettings: Moving group ${groupName} ${direction} (${instanceId.current})`);

      // Swap elements
      [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];

      const newPreferences = {
          ...currentPreferences,
          groupOrder: newOrder,
          activeView: 'custom',
      };
      setCurrentPreferences(newPreferences);
      if (onPreferencesChange) {
          onPreferencesChange(newPreferences);
      }
  }, [currentPreferences, onPreferencesChange]);

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
    // Ensure groupOrder only contains groups that are actually visible
    const finalPreferences = {
        ...currentPreferences,
        groupOrder: currentPreferences.groupOrder.filter(g => currentPreferences.visibleGroups.includes(g)),
    };
    log.info(`KpiSettings: Save requested. Saving preferences:`, finalPreferences, `(${instanceId.current})`);
    // Call the explicit save handler provided by the parent
    if (onSaveClick) {
        // Pass the cleaned-up internal state to the parent to save
        onSaveClick(finalPreferences);
    } else if (onPreferencesChange) {
        // Fallback: If only onPreferencesChange is provided, use that.
        // This implies the parent updates its state immediately on any change.
        log.warn(`KpiSettings: Using onPreferencesChange as fallback for save. Consider providing onSaveClick for explicit save action. (${instanceId.current})`)
        onPreferencesChange(finalPreferences);
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

          {/* Group Visibility Section - Refactored */}
          <div className="settings-section group-management">
             <div className="group-list-container">
                {/* Selected Groups List */}
                <div className="group-list selected-groups">
                    <h4 className="section-title">Selected & Ordered Groups</h4>
                    {currentPreferences.groupOrder.length > 0 ? (
                        currentPreferences.groupOrder.map((groupName, index) => (
                          <div key={groupName} className="list-item selected-item">
                             <div className="item-controls">
                                 {/* Move Up Button */}
                                 <button
                                     className="move-button"
                                     onClick={() => handleMoveGroup(groupName, 'up')}
                                     disabled={index === 0} // Disable if first item
                                     title="Move up"
                                  >
                                     ▲
                                 </button>
                                 {/* Move Down Button */}
                                 <button
                                     className="move-button"
                                     onClick={() => handleMoveGroup(groupName, 'down')}
                                     disabled={index === currentPreferences.groupOrder.length - 1} // Disable if last item
                                     title="Move down"
                                 >
                                     ▼
                                 </button>
                             </div>
                             <span className="item-label">
                                 {groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                             </span>
                             {/* Remove Button */}
                             <button
                                 className="action-button remove-button"
                                 onClick={() => handleRemoveGroup(groupName)}
                                 title="Remove group"
                             >
                                 &times; {/* Simple 'x' icon */}
                             </button>
                           </div>
                        ))
                    ) : (
                         <p className="no-groups-message">No groups selected.</p>
                    )}
                </div>

                {/* Available Groups List */}
                 <div className="group-list available-groups">
                     <h4 className="section-title">Available Groups</h4>
                     {availableGroups.filter(g => !currentPreferences.visibleGroups.includes(g)).length > 0 ? (
                         availableGroups
                             .filter(g => !currentPreferences.visibleGroups.includes(g)) // Only show groups not already selected
                             .map((groupName) => (
                                <div key={groupName} className="list-item available-item">
                                   <span className="item-label">
                                      {groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                                   </span>
                                   {/* Add Button */}
                                   <button
                                       className="action-button add-button"
                                       onClick={() => handleAddGroup(groupName)}
                                       title="Add group"
                                   >
                                       + {/* Simple '+' icon */}
                                   </button>
                                </div>
                             ))
                     ) : (
                          <p className="no-groups-message">All available groups are selected.</p>
                     )}
                 </div>
             </div>
             {availableGroups.length === 0 && (
                 <p className="no-groups-message centered-message">No KPI groups available to configure.</p>
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

        /* Group Toggles - Replaced with Group Management */
        .group-management {
            /* Container for the two lists */
        }
        .group-list-container {
            display: flex;
            gap: 20px; /* Space between Selected and Available lists */
            margin-top: 10px;
        }
        .group-list {
            flex: 1; /* Each list takes half the space */
            border: 1px solid rgba(92, 230, 207, 0.15);
            border-radius: ${BUTTON_BORDER_RADIUS};
            padding: 10px;
            min-height: 150px; /* Ensure lists have some minimum height */
            max-height: 250px; /* Limit height and allow scrolling if needed */
            overflow-y: auto;
            background-color: rgba(10, 20, 30, 0.4); /* Slightly different bg for lists */

             /* Scrollbar styles */
             scrollbar-width: thin;
             scrollbar-color: ${ACCENT_PRIMARY} rgba(0, 0, 0, 0.2);
        }
         .group-list::-webkit-scrollbar { width: 6px; }
         .group-list::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 3px; }
         .group-list::-webkit-scrollbar-thumb { background-color: ${ACCENT_PRIMARY}; border-radius: 3px; }


        .list-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 0; /* Vertical padding for items */
            border-bottom: 1px solid rgba(92, 230, 207, 0.1); /* Separator line */
        }
        .list-item:last-child {
            border-bottom: none;
        }

        .selected-item .item-controls {
            display: flex;
            flex-direction: column; /* Stack move buttons vertically */
            margin-right: 10px;
        }

        .item-label {
            color: ${TEXT_PRIMARY};
            font-size: 14px;
            flex-grow: 1; /* Allow label to take available space */
            margin-left: 5px; /* Space after controls or before add button */
            margin-right: 5px;
        }

        /* Specific Button Styles within lists */
        .action-button, .move-button {
             background-color: ${BUTTON_ACTION_BG};
             color: ${BUTTON_ACTION_COLOR};
             border: none;
             border-radius: 3px;
             cursor: pointer;
             transition: background-color 0.2s ease;
             font-weight: bold;
             line-height: 1; /* Ensure icon alignment */
             padding: ${BUTTON_MOVE_PADDING};
             font-size: ${BUTTON_MOVE_FONT_SIZE};
        }
        .action-button { /* Add/Remove */
            padding: 4px 8px; /* Adjust padding if needed */
             font-size: 16px;
        }

        .action-button:hover, .move-button:hover {
             background-color: ${BUTTON_ACTION_HOVER_BG};
        }

         .move-button:disabled {
             color: ${BUTTON_ACTION_DISABLED_COLOR};
             cursor: not-allowed;
             background-color: transparent;
         }

        .no-groups-message {
            color: ${TEXT_SECONDARY};
            font-style: italic;
            font-size: 14px;
            margin-top: 10px;
        }

        .centered-message {
            text-align: center;
            width: 100%; /* Make it span the container if used outside lists */
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