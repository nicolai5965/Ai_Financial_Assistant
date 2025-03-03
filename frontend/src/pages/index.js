import React, { useEffect, useState } from 'react';
// Import logger from the utils directory
const logger = require('../utils/logger');

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      // Log component mount
      logger.debug('Home page component mounted');
      setIsLoaded(true);
      
      // Example of logging component lifecycle
      return () => {
        logger.debug('Home page component unmounted');
      };
    } catch (error) {
      logger.error('Error in Home page initialization:', error);
    }
  }, []);

  // Example function to demonstrate logging user interactions
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
      logger.info('Home page fully rendered');
    }
  }, [isLoaded]);

  return (
    <div className="container">
      <main>
        <h1>Welcome to Your Financial Assistant</h1>
        <p>This is a Next.js-powered frontend for your AI Financial Assistant.</p>
        
        <div className="grid">
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
          color: #f8f8f8; /* Light color for better contrast on dark background */
        }

        p {
          text-align: center;
          line-height: 1.5;
          font-size: 1.5rem;
          color: #e0e0e0; /* Slightly dimmer than headers for visual hierarchy */
        }

        .grid {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          max-width: 800px;
          margin-top: 3rem;
        }

        .card {
          margin: 1rem;
          padding: 1.5rem;
          text-align: left;
          color: #e0e0e0;
          text-decoration: none;
          border: 1px solid #333333; /* Darker border for cards on dark background */
          background-color: #24201A; /* Slightly lighter than the background for cards */
          border-radius: 10px;
          transition: all 0.15s ease;
          width: 45%;
          cursor: pointer;
        }

        .card:hover,
        .card:focus,
        .card:active {
          color: #ffffff;
          border-color: #79b6f2; /* Light blue border on hover to match link color */
          transform: translateY(-3px); /* Slight raise effect on hover */
          box-shadow: 0 5px 10px rgba(0, 0, 0, 0.3); /* Shadow on hover for depth */
        }

        .card h2 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
          color: #f8f8f8; /* Bright headings */
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