import React, { useState, useEffect } from 'react';
import Image from 'next/image';
// Import logger
const logger = require('../../utils/logger');

/**
 * Sidebar component that provides navigation options
 * Can be toggled open/closed with animation
 * Uses dark blue (#0d1b2a) background for a sophisticated look
 * Positioned on the left side of the screen
 */
const Sidebar = ({ isOpen, toggleSidebar }) => {
  // Log when sidebar is mounted
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
          top: 80px; /* Position below the header */
          left: 0;
          height: calc(100vh - 80px); /* Full height minus header */
          background-color: #0d1b2a; /* Dark blue as requested */
          box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s ease;
          width: 250px;
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
          transition: opacity 0.2s;
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
          transition: opacity 0.2s;
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
          color: #f8f8f8;
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