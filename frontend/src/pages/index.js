import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { logger } from '../utils/logger';

/**
 * Home component - A modern dashboard-style landing page for the AI Financial Assistant.
 * It provides clear navigation to the main features of the application.
 */
export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const COMPONENT_NAME = 'Dashboard Home';

  const THEME = {
    bgColor: '#121212',
    primaryTextColor: '#EAEAEA',
    secondaryTextColor: '#B3B3B3',
    cardBgColor: '#1E1E1E',
    cardBorderColor: '#2C2C2C',
    accentColor: '#0D6EFD',
    accentColorHover: '#3D8BFF',
    cardShadow: '0 8px 25px rgba(0, 0, 0, 0.5)',
  };

  useEffect(() => {
    logger.debug(`${COMPONENT_NAME} component mounted`);
    setIsLoaded(true);
    return () => logger.debug(`${COMPONENT_NAME} component unmounted`);
  }, []);

  const handleFeatureClick = (featureName) => {
    logger.info(`User navigated to feature: ${featureName}`);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">Fin-AI Assistant</div>
        <nav>
          <a href="#" className="nav-link">Dashboard</a>
          <a href="#" className="nav-link">Settings</a>
        </nav>
      </header>

      <main className="main-content">
        <div className="welcome-section">
          <h1>Welcome Back</h1>
          <p>What would you like to do today?</p>
        </div>

        <div className="feature-grid">
          <Link href="/journal" className="feature-link" onClick={() => handleFeatureClick('Trade Journal')}>
            <div className="card">
              <div className="icon-wrapper">
                {/* Icon: Book/Journal */}
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              </div>
              <h2>Trade Journal</h2>
              <p>Upload and analyze your trading history with AI insights.</p>
            </div>
          </Link>

          <Link href="/stocks" className="feature-link" onClick={() => handleFeatureClick('Stock Analysis')}>
            <div className="card">
              <div className="icon-wrapper">
                {/* Icon: Chart/Graph */}
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <h2>Stock Analysis</h2>
              <p>Dive deep into stock data with interactive charts.</p>
            </div>
          </Link>
        </div>
      </main>

      <footer className="app-footer">
        <p>© {new Date().getFullYear()} Fin-AI Assistant. All rights reserved.</p>
      </footer>

      <style jsx>{`
        .app-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: ${THEME.bgColor};
        }

        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background-color: ${THEME.cardBgColor};
          border-bottom: 1px solid ${THEME.cardBorderColor};
          width: 100%;
        }

        .logo {
          font-size: 1.5rem;
          font-weight: bold;
          color: ${THEME.primaryTextColor};
        }

        nav {
          display: flex;
          gap: 1.5rem;
        }

        .nav-link {
          color: ${THEME.secondaryTextColor};
          text-decoration: none;
          font-size: 1rem;
          transition: color 0.2s ease;
        }

        .nav-link:hover {
          color: ${THEME.accentColor};
        }

        .main-content {
          flex: 1;
          padding: 3rem 2rem;
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
        }

        .welcome-section {
          text-align: center;
          margin-bottom: 3rem;
        }

        .welcome-section h1 {
          font-size: 3rem;
          font-weight: 600;
          color: ${THEME.primaryTextColor};
          margin-bottom: 0.5rem;
        }

        .welcome-section p {
          font-size: 1.25rem;
          color: ${THEME.secondaryTextColor};
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .feature-link {
          text-decoration: none;
          color: inherit;
        }

        .card {
          background-color: ${THEME.cardBgColor};
          border: 1px solid ${THEME.cardBorderColor};
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          height: 100%;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .card:hover {
          transform: translateY(-5px);
          border-color: ${THEME.accentColor};
          box-shadow: ${THEME.cardShadow};
        }
        
        .icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background-color: ${THEME.accentColor};
          border-radius: 50%;
          color: white;
          margin-bottom: 1rem;
        }

        .card h2 {
          font-size: 1.75rem;
          font-weight: 600;
          color: ${THEME.primaryTextColor};
          margin: 0;
        }

        .card p {
          font-size: 1rem;
          color: ${THEME.secondaryTextColor};
          line-height: 1.6;
          margin: 0;
        }

        .app-footer {
          text-align: center;
          padding: 2rem;
          font-size: 0.9rem;
          color: ${THEME.secondaryTextColor};
          border-top: 1px solid ${THEME.cardBorderColor};
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
          color: ${THEME.primaryTextColor};
        }
        * {
          box-sizing: border-box;
        }
        h1, h2, h3, h4, h5, h6 {
          margin: 0;
        }
      `}</style>
    </div>
  );
}