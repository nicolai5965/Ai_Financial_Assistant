import React, { useEffect, useState } from 'react';
import Link from 'next/link';
// Import logger from the utils directory
import { logger } from '../utils/logger';

/**
 * Home component - Main landing page for the AI Financial Assistant
 * Displays welcome message and feature navigation cards
 * Implements comprehensive logging of component lifecycle and user interactions
 */
export default function Home() {
  // Component state
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Constants for repeated values
  const COMPONENT_NAME = 'Home page';
  
  // Theme constants for styling consistency
  const THEME = {
    headerFontColor: '#f8f8f8',
    textColor: '#e0e0e0', 
    cardBgColor: '#24201A',
    cardBorderColor: '#333333',
    cardHoverBorderColor: '#79b6f2',
    cardShadow: '0 5px 10px rgba(0, 0, 0, 0.3)',
  };

  // Log component mount and setup cleanup
  useEffect(() => {
    try {
      logger.debug(`${COMPONENT_NAME} component mounted`);
      setIsLoaded(true);
      
      return () => {
        logger.debug(`${COMPONENT_NAME} component unmounted`);
      };
    } catch (error) {
      logger.error(`Error in ${COMPONENT_NAME} initialization:`, error);
    }
  }, []);

  /**
   * Handles user interaction with feature cards
   * @param {string} featureName - The name of the feature that was clicked
   */
  const handleFeatureClick = (featureName) => {
    try {
      logger.info(`User clicked on feature: ${featureName}`);
      // Additional logic would go here
    } catch (error) {
      logger.error(`Error handling click on ${featureName}:`, error);
    }
  };

  // Log when the component is fully rendered
  useEffect(() => {
    if (isLoaded) {
      logger.info(`${COMPONENT_NAME} fully rendered`);
    }
  }, [isLoaded]);

  return (
    <div className="container">
      <main>
        <h1>Welcome to Your Financial Assistant</h1>
        <p>This is a Next.js-powered frontend for your AI Financial Assistant.</p>
        
        <div className="grid">
          <Link href="/stocks" className="card-link">
            <div className="card" onClick={() => handleFeatureClick('Stock Analysis')}>
              <h2>Stock Analysis &rarr;</h2>
              <p>Analyze stock data with interactive charts and technical indicators.</p>
            </div>
          </Link>
          
          <div className="card" onClick={() => handleFeatureClick('Getting Started')}>
            <h2>Getting Started</h2>
            <p>This is a simple starter page for your Next.js application.</p>
          </div>
          
          <div className="card" onClick={() => handleFeatureClick('Features')}>
            <h2>Features</h2>
            <p>Your app will soon connect to a FastAPI backend for financial analysis.</p>
          </div>
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }

        main {
          padding: 2rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          width: 100%;
        }

        h1 {
          margin: 0;
          line-height: 1.15;
          font-size: 3rem;
          text-align: center;
          color: ${THEME.headerFontColor}; /* Using theme constant for consistent colors */
        }

        p {
          text-align: center;
          line-height: 1.5;
          font-size: 1.5rem;
          color: ${THEME.textColor}; /* Using theme constant for consistent colors */
        }

        .grid {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          max-width: 800px;
          margin-top: 3rem;
        }

        .card-link {
          text-decoration: none;
          color: inherit;
          width: 45%;
          margin: 1rem;
        }

        .card {
          padding: 1.5rem;
          text-align: left;
          color: ${THEME.textColor};
          border: 1px solid ${THEME.cardBorderColor}; /* Using theme constant */
          background-color: ${THEME.cardBgColor}; /* Using theme constant */
          border-radius: 10px;
          transition: all 0.15s ease;
          height: 100%;
          cursor: pointer;
        }

        .card:hover,
        .card:focus,
        .card:active {
          color: #ffffff;
          border-color: ${THEME.cardHoverBorderColor}; /* Using theme constant */
          transform: translateY(-3px); /* Slight raise effect on hover */
          box-shadow: ${THEME.cardShadow}; /* Using theme constant */
        }

        .card h2 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
          color: ${THEME.headerFontColor}; /* Using theme constant */
        }

        .card p {
          margin: 0;
          font-size: 1.25rem;
          line-height: 1.5;
        }
      `}</style>

      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
} 