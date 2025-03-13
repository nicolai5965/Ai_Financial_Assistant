import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import '../styles/globals.css';
// Import logger from the utils directory
const logger = require('../utils/logger');

// Router event name constants to prevent typos and ensure consistency
const ROUTE_EVENTS = {
  CHANGE_START: 'routeChangeStart',
  CHANGE_COMPLETE: 'routeChangeComplete',
  CHANGE_ERROR: 'routeChangeError'
};

/**
 * Custom App component that wraps all pages with consistent layout and logging
 * 
 * @param {Object} props - Component props
 * @param {React.Component} props.Component - The page component to be rendered
 * @param {Object} props.pageProps - Props passed to the page component
 * @returns {JSX.Element} Rendered application with layout wrapper
 */
function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Log application initialization
    logger.info('Application initialized');
    
    // Event handler functions - extracted for better readability
    const handleRouteChangeStart = (url) => {
      logger.debug(`Navigation started to: ${url}`);
    };
    
    const handleRouteChangeComplete = (url) => {
      logger.info(`Navigation completed to: ${url}`);
    };
    
    const handleRouteChangeError = (err, url) => {
      logger.error(`Navigation error to ${url}:`, err);
    };
    
    // Add router event listeners
    router.events.on(ROUTE_EVENTS.CHANGE_START, handleRouteChangeStart);
    router.events.on(ROUTE_EVENTS.CHANGE_COMPLETE, handleRouteChangeComplete);
    router.events.on(ROUTE_EVENTS.CHANGE_ERROR, handleRouteChangeError);
    
    // Clean up event listeners on component unmount to prevent memory leaks
    return () => {
      router.events.off(ROUTE_EVENTS.CHANGE_START, handleRouteChangeStart);
      router.events.off(ROUTE_EVENTS.CHANGE_COMPLETE, handleRouteChangeComplete);
      router.events.off(ROUTE_EVENTS.CHANGE_ERROR, handleRouteChangeError);
    };
  }, [router]);
  
  // Wrap component rendering in try/catch to log any rendering errors
  try {
    return (
      <Layout>
        <Component {...pageProps} />
      </Layout>
    );
  } catch (error) {
    logger.error('Error rendering page component:', error);
    // Return a fallback UI or rethrow the error
    throw error;
  }
}

export default MyApp; 