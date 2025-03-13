import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
// Import logger
import { logger } from '../../utils/logger';

// Constants for styling and configuration
const HEADER_HEIGHT = 80;
const HEADER_BG_COLOR = '#010203'; // Rich Black
const HEADER_TEXT_COLOR = '#ffffff';
const LOGO_DIMENSIONS = { width: 60, height: 60 };

/**
 * Header component that stays fixed at the top of the page
 * Contains the project logo/name and navigation elements
 * Uses Rich Black (#010203) background for a sophisticated look
 * Image is positioned on the left side, next to the company name
 */
const Header = () => {
  // Log component lifecycle events
  React.useEffect(() => {
    try {
      logger.debug('Header component mounted');
    } catch (e) {
      console.log('Header component mounted');
    }
    
    return () => {
      try {
        logger.debug('Header component unmounted');
      } catch (e) {
        console.log('Header component unmounted');
      }
    };
  }, []);

  /**
   * Handles logo click events and logs user interaction
   */
  const handleLogoClick = () => {
    try {
      logger.info('User clicked on project logo');
    } catch (e) {
      console.log('User clicked on project logo');
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-container">
          {/* Project image on the left */}
          <div className="project-image">
            <Image 
              src="/assets/project_image.png"
              alt="Project Logo" 
              width={LOGO_DIMENSIONS.width}
              height={LOGO_DIMENSIONS.height}
              priority
            />
          </div>
          
          {/* Company name next to the image */}
          <div className="logo-section">
            <Link href="/" onClick={handleLogoClick}>
              <h1>Financial Assistant</h1>
            </Link>
          </div>
        </div>
        
        {/* Right side reserved for future navigation elements */}
        <div className="nav-placeholder"></div>
      </div>
      
      {/* Styling for the header */}
      <style jsx>{`
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: ${HEADER_HEIGHT}px;
          background-color: ${HEADER_BG_COLOR};
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
          z-index: 1000; /* Ensure header is above other content */
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0;
          padding-right: 2rem;
          height: 100%;
          width: 100%;
          max-width: 1400px;
          margin: 0;
        }
        
        .logo-container {
          display: flex;
          align-items: center;
          gap: 1rem; /* Space between image and text */
          padding-left: 1rem;
        }
        
        .project-image {
          display: flex;
          align-items: center;
        }
        
        .logo-section h1 {
          margin: 0;
          font-size: 2.1rem;
          color: ${HEADER_TEXT_COLOR};
          cursor: pointer;
        }
        
        .logo-section a {
          text-decoration: none;
          color: inherit;
        }
      `}</style>
    </header>
  );
};

export default Header; 