import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from './Header';
import Sidebar from './Sidebar';
// Import logger
const logger = require('../../utils/logger');

// CSS constants for consistent styling
const SHADOW_BLACK = '#1B1610';
const LIGHT_TEXT_COLOR = '#f8f8f8';
const LINK_COLOR = '#79b6f2';
const HEADER_MARGIN = '80px';
const SIDEBAR_WIDTH = '250px';

/**
 * Layout component that wraps all pages
 * Provides consistent structure with header, sidebar and main content area
 * Uses Shadow Black (#1B1610) background for a sophisticated dark theme
 * Manages sidebar open/close state
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render inside the layout
 * @returns {React.ReactElement} The rendered layout component
 */
const Layout = ({ children }) => {
  // State to track if sidebar is open or closed
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Function to toggle sidebar state
  const toggleSidebar = () => {
    logger.debug(`Toggling sidebar: ${sidebarOpen ? 'close' : 'open'}`);
    setSidebarOpen(!sidebarOpen);
  };
  
  // Component lifecycle logging
  useEffect(() => {
    logger.debug('Layout component mounted');
    
    return () => {
      logger.debug('Layout component unmounted');
    };
  }, []);

  return (
    <div className="layout">
      <Head>
        <title>Financial Assistant</title>
        <meta name="description" content="AI-powered Financial Assistant" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Header />
      
      {/* Sidebar component with toggle functionality */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main content area - adjusts margin when sidebar is open */}
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {children}
      </main>
      
      <style jsx>{`
        .layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: ${SHADOW_BLACK};
          color: ${LIGHT_TEXT_COLOR};
        }
        
        .main-content {
          flex: 1;
          margin-top: ${HEADER_MARGIN}; /* Matches the current header height */
          width: 100%;
          transition: margin-left 0.3s ease; /* Smooth transition for sidebar */
        }
        
        /* Adjust main content when sidebar is open */
        .main-content.sidebar-open {
          margin-left: ${SIDEBAR_WIDTH}; /* Match the sidebar width */
        }
      `}</style>
      
      {/* Global styles for color theme consistency */}
      <style jsx global>{`
        body {
          background-color: ${SHADOW_BLACK};
          color: ${LIGHT_TEXT_COLOR};
          margin: 0;
          padding: 0;
        }
        
        a {
          color: ${LINK_COLOR}; /* Light blue for links, better visible on dark background */
        }
      `}</style>
    </div>
  );
};

export default Layout; 