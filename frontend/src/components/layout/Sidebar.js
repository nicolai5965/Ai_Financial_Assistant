// Sidebar.js

// ---------------------------------------------------------------------
// Import Statements
// ---------------------------------------------------------------------
import React, { useEffect } from 'react';
import Image from 'next/image';
import { logger } from '../../utils/logger'; // Assuming logger path is correct

// ---------------------------------------------------------------------
// Constants for Styling - Adopted from StockSettingsSidebar Theme
// ---------------------------------------------------------------------
// LAYOUT - Dimensions and positioning
const SIDEBAR_WIDTH = '200px'; // Adopted width
const SIDEBAR_Z_INDEX = 900;
const HEADER_HEIGHT = '80px'; // Ensure this matches your actual header height

// COLORS - Primary palette (from StockSettingsSidebar)
const PRIMARY_DARK = 'rgba(13, 27, 42, 1)';      // Dark blue
const PRIMARY_LIGHT = 'rgba(26, 42, 58, 1)';      // Light blue
const ACCENT_PRIMARY = 'rgba(92, 230, 207, 1)';   // Cyan
const ACCENT_HOVER = 'rgba(59, 205, 186, 1)';     // Darker cyan (for hover states)
const TEXT_PRIMARY = 'rgba(248, 248, 248, 1)';    // White text
const TEXT_SECONDARY = 'rgba(204, 204, 204, 1)';   // Light gray text
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.5)';         // Black shadow

// SIDEBAR - General sidebar styling (from StockSettingsSidebar)
const SIDEBAR_BG_COLOR = `linear-gradient(to bottom, ${PRIMARY_DARK}, ${PRIMARY_LIGHT})`;
// Adjusted for left sidebar: border-right and positive shadow offset
const SIDEBAR_BORDER = `1px solid rgba(92, 230, 207, 0.1)`;
const SIDEBAR_SHADOW = `4px 0 15px ${SHADOW_COLOR}`; // Positive X offset for right shadow

// EFFECTS - Glows and transitions
const ACCENT_GLOW = `0 0 10px rgba(92, 230, 207, 0.7)`;
const BUTTON_TRANSITION = 'opacity 0.2s, transform 0.2s'; // Added transform
const SIDEBAR_TRANSITION = 'transform 0.3s ease';

// NAVIGATION LINKS
const LINK_HOVER_BG = 'rgba(92, 230, 207, 0.1)'; // Subtle accent background on hover
const LINK_HOVER_TEXT = ACCENT_PRIMARY; // Use accent color for text on hover

/**
 * Sidebar component that provides navigation options, styled consistently
 * with the StockSettingsSidebar theme.
 * Can be toggled open/closed with animation.
 * Positioned on the left side of the screen.
 *
 * Props:
 * - isOpen: Boolean indicating whether the sidebar is open.
 * - toggleSidebar: Function to toggle sidebar open/closed state.
 */
const Sidebar = ({ isOpen, toggleSidebar }) => {
  // Component lifecycle logging
  useEffect(() => {
    logger.debug('Sidebar component mounted');
    return () => {
      logger.debug('Sidebar component unmounted');
    };
  }, []);

  // Log when sidebar state changes
  useEffect(() => {
    logger.info(`Sidebar ${isOpen ? 'opened' : 'closed'}`);
  }, [isOpen]);

  // Handle close button click
  const handleCloseClick = () => {
    logger.debug('User clicked sidebar close button');
    toggleSidebar();
  };

  return (
    <>
      {/* Sidebar component */}
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-content">
          {/* Close button in the upper right corner */}
          <div className="close-button" onClick={handleCloseClick}>
            <Image
              src="/assets/sidebar_close_arrow.png" // Keep existing icon
              alt="Close Sidebar"
              width={24}
              height={24}
            />
          </div>

          {/* Sidebar navigation links */}
          <nav className="sidebar-nav">
            <ul>
              {/* Example Links - update href as needed */}
              <li><a href="/">Dashboard</a></li>
              <li><a href="/reports">Reports</a></li>
              <li><a href="/stocks">Stock Analysis</a></li>
              <li><a href="/settings">Settings</a></li>
              {/* Add more navigation links here */}
            </ul>
          </nav>
        </div>
      </div>

      {/* Open sidebar button - only visible when sidebar is closed */}
      {!isOpen && (
        <div className="open-button" onClick={toggleSidebar}>
          <Image
            src="/assets/sidebar_open_icon.png" // Keep existing icon
            alt="Open Sidebar"
            width={30} // Slightly larger icon maybe? Adjust as needed.
            height={30}
          />
        </div>
      )}

      {/* Styles for the sidebar */}
      <style jsx>{`
        .sidebar {
          position: fixed;
          top: ${HEADER_HEIGHT}; /* Position below the header */
          left: 0;
          height: calc(100vh - ${HEADER_HEIGHT}); /* Full height minus header */
          background: ${SIDEBAR_BG_COLOR}; /* Use gradient background */
          box-shadow: ${SIDEBAR_SHADOW}; /* Use themed shadow */
          transition: ${SIDEBAR_TRANSITION};
          width: ${SIDEBAR_WIDTH}; /* Use themed width */
          z-index: ${SIDEBAR_Z_INDEX}; /* Use themed z-index */
          border-right: ${SIDEBAR_BORDER}; /* Use themed border on the right */
          overflow-y: auto; /* Add scroll for potentially long content */
          scrollbar-width: thin; /* Consistent scrollbar styling */
          scrollbar-color: ${ACCENT_PRIMARY} rgba(0, 0, 0, 0.2);
        }

        /* Scrollbar styling for WebKit browsers */
        .sidebar::-webkit-scrollbar {
          width: 8px;
        }

        .sidebar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }

        .sidebar::-webkit-scrollbar-thumb {
          background-color: ${ACCENT_PRIMARY};
          border-radius: 4px;
        }

        .sidebar.closed {
          transform: translateX(-100%); /* Move off-screen when closed */
          box-shadow: none; /* Hide shadow when closed */
        }

        .sidebar.open {
          transform: translateX(0); /* Visible when open */
        }

        .sidebar-content {
          padding: 1rem;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 20px; /* Add gap consistent with StockSettingsSidebar */
        }

        .close-button {
          align-self: flex-end;
          cursor: pointer;
          padding: 0.5rem; /* Keep padding for click area */
          transition: ${BUTTON_TRANSITION}, transform 0.2s; /* Smooth transition for opacity and transform */
          background: rgba(92, 230, 207, 0.3); /* Themed background */
          border-radius: 50%; /* Circular button */
          display: flex; /* Center icon */
          justify-content: center;
          align-items: center;
          width: 36px; /* Specific size like StockSettingsSidebar */
          height: 36px;
          margin-bottom: 5px; /* Spacing below button */
        }

        .close-button:hover {
          opacity: 0.8;
          transform: rotate(90deg); /* Add rotation on hover */
        }

        .open-button {
          position: fixed;
          top: 80px; /* Just below the header, adjust if needed */
          left: 10px;
          cursor: pointer;
          z-index: ${SIDEBAR_Z_INDEX - 10}; /* Below sidebar but above content */
          padding: 0.5rem;
          border-radius: 50%;
          transition: transform 0.2s, box-shadow 0.2s; /* Use themed transitions */
          background: ${PRIMARY_DARK}; /* Use themed dark background */
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 0 10px ${SHADOW_COLOR}; /* Themed shadow */
        }

        .open-button:hover {
          transform: scale(1.1); /* Themed hover effect */
          box-shadow: 0 0 15px ${SHADOW_COLOR}, 0 0 5px ${ACCENT_PRIMARY}; /* Enhanced shadow + glow */
        }

        .sidebar-nav {
          margin-top: 1rem; /* Adjusted margin */
        }

        .sidebar-nav ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .sidebar-nav li {
          margin-bottom: 0.5rem; /* Slightly tighter spacing */
        }

        .sidebar-nav a {
          color: ${TEXT_PRIMARY}; /* Use themed text color */
          text-decoration: none;
          display: block;
          padding: 0.75rem 1rem; /* Slightly more padding */
          transition: background-color 0.2s, color 0.2s, text-shadow 0.2s; /* Smooth transitions */
          border-radius: 4px;
          font-size: 15px; /* Slightly larger font */
          letter-spacing: 0.5px;
        }

        .sidebar-nav a:hover {
          background-color: ${LINK_HOVER_BG}; /* Themed hover background */
          color: ${LINK_HOVER_TEXT}; /* Themed hover text color */
          text-shadow: 0 0 5px rgba(92, 230, 207, 0.5); /* Subtle glow on hover */
        }
      `}</style>
    </>
  );
};

export default Sidebar;