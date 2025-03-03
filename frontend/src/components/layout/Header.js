import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
// Import logger
const logger = require('../../utils/logger');

/**
 * Header component that stays fixed at the top of the page
 * Contains the project logo/name and navigation elements
 * Uses Rich Black (#010203) background for a sophisticated look
 * Image is positioned on the left side, next to the company name
 */
const Header = () => {
  // Log when header is mounted
  React.useEffect(() => {
    logger.debug('Header component mounted');
    
    return () => {
      logger.debug('Header component unmounted');
    };
  }, []);

  // Log when logo is clicked
  const handleLogoClick = () => {
    logger.info('User clicked on project logo');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-container">
          {/* Project image now on the left */}
          <div className="project-image">
            <Image 
              src="/assets/project_image.png"
              alt="Project Logo" 
              width={60}
              height={60}
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
        
        {/* Right side empty for now, could add navigation here later */}
        <div className="nav-placeholder"></div>
      </div>
      
      {/* Styling for the header */}
      <style jsx>{`
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 80px; 
          background-color: #010203; /* Rich Black as requested */
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
          z-index: 1000; /* Ensure header is above other content */
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0;
          padding-right: 2rem; /* Only add padding to the right side */
          height: 100%;
          width: 100%;
          max-width: 1400px;
          margin: 0;
        }
        
        .logo-container {
          display: flex;
          align-items: center;
          gap: 1rem; /* Space between image and text */
          padding-left: 1rem; /* Small padding for the logo container */
        }
        
        .project-image {
          display: flex;
          align-items: center;
        }
        
        .logo-section h1 {
          margin: 0;
          font-size: 2.1rem; /* Slightly larger font to match thicker header */
          color: #ffffff; /* White text for better contrast with dark background */
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