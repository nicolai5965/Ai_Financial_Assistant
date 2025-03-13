import React from 'react';

// CSS styling constants for consistent theming
const STYLES = {
  OVERLAY_BG_COLOR: 'rgba(0, 0, 0, 0.1)',
  SPINNER_BG_COLOR: 'rgba(0, 0, 0, 0.7)',
  TEXT_COLOR: 'white',
  BORDER_RADIUS: '4px',
  Z_INDEX: 10,
  PADDING: {
    SPINNER: '15px 30px',
  },
};

/**
 * LoadingOverlay component for displaying a loading spinner overlay
 * 
 * This component creates a relative container around its children and
 * displays a loading overlay with a customizable message when isLoading is true.
 * The overlay covers the entire container with a semi-transparent background.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isLoading - Whether the loading state is active
 * @param {React.ReactNode} props.children - Child components to render under the overlay
 * @param {string} [props.message="Loading..."] - Custom loading message to display
 * @returns {React.ReactElement} The rendered component
 */
const LoadingOverlay = ({ isLoading, children, message = "Loading..." }) => {
  return (
    <div className="loading-container">
      {/* Render children regardless of loading state */}
      {children}
      
      {/* Conditionally render the loading overlay when isLoading is true */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            {message}
          </div>
        </div>
      )}
      
      {/* Component-scoped styling using styled-jsx */}
      <style jsx>{`
        /* Container with relative positioning to properly position the overlay */
        .loading-container {
          position: relative;
        }
        
        /* Overlay that covers the entire container */
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: ${STYLES.OVERLAY_BG_COLOR};
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: ${STYLES.Z_INDEX};
        }
        
        /* The spinner/message container */
        .loading-spinner {
          padding: ${STYLES.PADDING.SPINNER};
          background-color: ${STYLES.SPINNER_BG_COLOR};
          border-radius: ${STYLES.BORDER_RADIUS};
          color: ${STYLES.TEXT_COLOR};
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay; 