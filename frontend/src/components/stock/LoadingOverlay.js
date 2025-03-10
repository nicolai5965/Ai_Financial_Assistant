import React from 'react';

/**
 * LoadingOverlay component for displaying a loading spinner overlay
 * @param {Object} props - Component props
 * @param {boolean} props.isLoading - Whether the loading state is active
 * @param {React.ReactNode} props.children - Child components to render under the overlay
 * @param {string} [props.message="Loading..."] - Custom loading message to display
 */
const LoadingOverlay = ({ isLoading, children, message = "Loading..." }) => {
  return (
    <div className="loading-container">
      {children}
      
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            {message}
          </div>
        </div>
      )}
      
      <style jsx>{`
        .loading-container {
          position: relative;
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10;
        }
        
        .loading-spinner {
          padding: 15px 30px;
          background-color: rgba(0, 0, 0, 0.7);
          border-radius: 4px;
          color: white;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay; 