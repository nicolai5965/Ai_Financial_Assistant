import React, { useState } from 'react';
import Head from 'next/head';
import Header from './Header';
import Sidebar from './Sidebar';
// Import logger
const logger = require('../../utils/logger');

/**
 * Layout component that wraps all pages
 * Provides consistent structure with header, sidebar and main content area
 * Uses Shadow Black (#1B1610) background for a sophisticated dark theme
 * Manages sidebar open/close state
 */
const Layout = ({ children }) => {
  // State to track if sidebar is open or closed
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Function to toggle sidebar state
  const toggleSidebar = () => {
    logger.debug(`Toggling sidebar: ${sidebarOpen ? 'close' : 'open'}`);
    setSidebarOpen(!sidebarOpen);
  };
  
  // Log when layout is mounted
  React.useEffect(() => {
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
      
      {/* Add Sidebar component */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {children}
      </main>
      
      <style jsx>{`
        .layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: #1B1610; /* Shadow Black as requested */
          color: #f8f8f8; /* Light text color for better readability on dark background */
        }
        
        .main-content {
          flex: 1;
          margin-top: 80px; /* Updated to match the current header height of 80px */
          width: 100%;
          transition: margin-left 0.3s ease; /* Smooth transition when sidebar opens/closes */
        }
        
        /* Add margin to main content when sidebar is open */
        .main-content.sidebar-open {
          margin-left: 250px; /* Match the sidebar width */
        }
      `}</style>
      
      {/* Global styles for color theme consistency */}
      <style jsx global>{`
        body {
          background-color: #1B1610; /* Shadow Black */
          color: #f8f8f8;
          margin: 0;
          padding: 0;
        }
        
        a {
          color: #79b6f2; /* Light blue for links, better visible on dark background */
        }
      `}</style>
    </div>
  );
};

export default Layout; 