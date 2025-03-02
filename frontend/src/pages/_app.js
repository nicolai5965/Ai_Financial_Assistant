import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
// Import logger from the utils directory
const logger = require('../utils/logger');

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Log application initialization
    logger.info('Application initialized');
    
    // Log page navigation events
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
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);
    
    // Clean up event listeners on component unmount
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router]);
  
  // Log any errors in the component rendering
  try {
    return <Component {...pageProps} />;
  } catch (error) {
    logger.error('Error rendering page component:', error);
    // Return a fallback UI or rethrow the error
    throw error;
  }
}

export default MyApp; 