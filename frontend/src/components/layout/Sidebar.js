import React, { useState, useEffect } from 'react';
import Image from 'next/image';
// Import logger
const logger = require('../../utils/logger');

// Constants for styling and configuration
const SIDEBAR_WIDTH = '250px';
const HEADER_HEIGHT = '80px';
const SIDEBAR_BACKGROUND = '#0d1b2a';  // Dark blue
const SIDEBAR_TEXT_COLOR = '#f8f8f8';  // Light gray
const BUTTON_TRANSITION = 'opacity 0.2s';
const SIDEBAR_TRANSITION = 'transform 0.3s ease';

/**
 * Sidebar component that provides navigation options
 * Can be toggled open/closed with animation
 * Uses dark blue (#0d1b2a) background for a sophisticated look
 * Positioned on the left side of the screen
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
              src="/assets/sidebar_close_arrow.png"
              alt="Close Sidebar" 
              width={24}
              height={24}
            />
          </div>
          
          {/* Sidebar navigation links can go here */}
          <nav className="sidebar-nav">
            <ul>
              <li><a href="/">Dashboard</a></li>
              <li><a href="/reports">Reports</a></li>
              <li><a href="/stocks">Stock Analysis</a></li>
              <li><a href="/settings">Settings</a></li>
            </ul>
          </nav>
        </div>
      </div>
      
      {/* Open sidebar button - only visible when sidebar is closed */}
      {!isOpen && (
        <div className="open-button" onClick={toggleSidebar}>
          <Image 
            src="/assets/sidebar_open_icon.png"
            alt="Open Sidebar" 
            width={24}
            height={24}
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
          background-color: ${SIDEBAR_BACKGROUND};
          box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
          transition: ${SIDEBAR_TRANSITION};
          width: ${SIDEBAR_WIDTH};
          z-index: 900; /* Lower than header but higher than content */
        }
        
        .sidebar.closed {
          transform: translateX(-100%); /* Move off-screen when closed */
        }
        
        .sidebar.open {
          transform: translateX(0); /* Visible when open */
        }
        
        .sidebar-content {
          padding: 1rem;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .close-button {
          align-self: flex-end;
          cursor: pointer;
          padding: 0.5rem;
          transition: ${BUTTON_TRANSITION};
        }
        
        .close-button:hover {
          opacity: 0.8;
        }
        
        .open-button {
          position: fixed;
          top: 90px; /* Just below the header */
          left: 10px;
          cursor: pointer;
          z-index: 800;
          padding: 0.5rem;
          border-radius: 50%;
          transition: ${BUTTON_TRANSITION};
          background-color: rgba(13, 27, 42, 0.7); /* Semi-transparent dark blue */
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .open-button:hover {
          opacity: 0.8;
        }
        
        .sidebar-nav {
          margin-top: 2rem;
        }
        
        .sidebar-nav ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .sidebar-nav li {
          margin-bottom: 1rem;
        }
        
        .sidebar-nav a {
          color: ${SIDEBAR_TEXT_COLOR};
          text-decoration: none;
          display: block;
          padding: 0.5rem;
          transition: background-color 0.2s;
          border-radius: 4px;
        }
        
        .sidebar-nav a:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </>
  );
};

export default Sidebar; 