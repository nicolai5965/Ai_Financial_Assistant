/**
 * KpiCard component for displaying an individual KPI.
 * 
 * This component renders a card with a KPI's name, value, and optional description.
 * It also handles color-coding for positive/negative values.
 */

import React, { useState } from 'react';
import { logger } from '../../../utils/logger';

// Fallback logger for development or if the main logger fails
const safeLogger = {
  debug: (message) => console.log(`[DEBUG] ${message}`),
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

// Use the imported logger if available, otherwise use the fallback
const log = typeof logger !== 'undefined' ? logger : safeLogger;

// Constants for styling and layout
const BORDER_RADIUS = '4px';
const CARD_BG_COLOR = '#1e1e1e';
const CARD_HOVER_BG_COLOR = '#2a2a2a';
const TEXT_COLOR = '#ffffff';
const SUBTITLE_COLOR = '#a0a0a0';
const POSITIVE_COLOR = '#4caf50';
const NEGATIVE_COLOR = '#f44336';
const NEUTRAL_COLOR = '#78909c';
const CARD_MIN_WIDTH = '140px';
const CARD_MAX_WIDTH = '200px';
const CARD_HEIGHT = '100px';
const CARD_PADDING = '12px';

/**
 * Component to display an individual KPI in a card format.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.kpi - The KPI data object
 * @param {boolean} props.isLoading - Whether the KPI is currently loading
 * @param {Function} props.onClick - Optional click handler for the card
 * @returns {JSX.Element} The rendered component
 */
const KpiCard = ({ kpi, isLoading = false, onClick = null }) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  
  // Generate a unique instance ID for logging
  const instanceId = React.useRef(`kpi-card-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
  
  // Log component mount and unmount
  React.useEffect(() => {
    try {
      log.debug(`KpiCard mounted: ${kpi?.name || 'unknown'} (${instanceId.current})`);
    } catch (e) {
      console.log(`KpiCard mounted: ${kpi?.name || 'unknown'} (${instanceId.current})`);
    }
    
    return () => {
      try {
        log.debug(`KpiCard unmounting: ${kpi?.name || 'unknown'} (${instanceId.current})`);
      } catch (e) {
        console.log(`KpiCard unmounting: ${kpi?.name || 'unknown'} (${instanceId.current})`);
      }
    };
  }, [kpi?.name]);
  
  // Handle null or undefined KPI
  if (!kpi && !isLoading) {
    return null;
  }
  
  // Determine color based on value trend or explicit color setting
  const getValueColor = () => {
    if (isLoading) {
      return NEUTRAL_COLOR;
    }
    
    const value = kpi?.value || {};
    if (value.color === 'positive') {
      return POSITIVE_COLOR;
    } else if (value.color === 'negative') {
      return NEGATIVE_COLOR;
    }
    
    return NEUTRAL_COLOR;
  };
  
  // Show tooltip with description
  const handleMouseEnter = () => {
    if (kpi?.description) {
      setTooltipVisible(true);
    }
  };
  
  // Hide tooltip
  const handleMouseLeave = () => {
    setTooltipVisible(false);
  };
  
  // Handle card click
  const handleClick = () => {
    if (onClick && kpi) {
      try {
        log.debug(`KpiCard clicked: ${kpi?.name || 'unknown'} (${instanceId.current})`);
      } catch (e) {
        console.log(`KpiCard clicked: ${kpi?.name || 'unknown'} (${instanceId.current})`);
      }
      onClick(kpi);
    }
  };
  
  return (
    <div 
      className="kpi-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {isLoading ? (
        // Loading state
        <div className="loading-state">
          <div className="loading-line name-loading"></div>
          <div className="loading-line value-loading"></div>
        </div>
      ) : (
        // Loaded state
        <>
          <div className="kpi-name">{kpi?.name || 'N/A'}</div>
          <div className="kpi-value" style={{ color: getValueColor() }}>
            {kpi?.value?.formatted_value || 'N/A'}
          </div>
          {tooltipVisible && kpi?.description && (
            <div className="kpi-tooltip">
              {kpi.description}
            </div>
          )}
        </>
      )}
      
      {/* Styled JSX */}
      <style jsx>{`
        .kpi-card {
          position: relative;
          background-color: ${CARD_BG_COLOR};
          border-radius: ${BORDER_RADIUS};
          padding: ${CARD_PADDING};
          min-width: ${CARD_MIN_WIDTH};
          max-width: ${CARD_MAX_WIDTH};
          height: ${CARD_HEIGHT};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: background-color 0.2s ease, transform 0.2s ease;
          cursor: ${onClick ? 'pointer' : 'default'};
          overflow: hidden;
        }
        
        .kpi-card:hover {
          background-color: ${CARD_HOVER_BG_COLOR};
          transform: ${onClick ? 'translateY(-2px)' : 'none'};
        }
        
        .kpi-name {
          font-size: 14px;
          font-weight: 500;
          color: ${SUBTITLE_COLOR};
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .kpi-value {
          font-size: 20px;
          font-weight: 700;
          color: ${TEXT_COLOR};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .kpi-tooltip {
          position: absolute;
          top: 100%;
          left: 0;
          width: 200px;
          background-color: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 8px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: opacity 0.2s ease;
        }
        
        /* Loading state styles */
        .loading-state {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        
        .loading-line {
          background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 2px;
        }
        
        .name-loading {
          width: 80%;
          height: 14px;
          margin-bottom: 8px;
        }
        
        .value-loading {
          width: 60%;
          height: 20px;
        }
        
        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default KpiCard;
