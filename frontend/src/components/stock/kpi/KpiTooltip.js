/**
 * KpiTooltip component for displaying detailed explanations and contextual information
 * about Key Performance Indicators (KPIs).
 * 
 * This component provides enhanced tooltips with rich content including descriptions,
 * trend indicators, and context-specific information based on KPI type.
 */

import React, { useState, useEffect, useRef } from 'react';
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
const TOOLTIP_BG_COLOR = 'rgba(18, 18, 18, 0.98)';
const TOOLTIP_BORDER_COLOR = '#444';
const TOOLTIP_TEXT_COLOR = '#ffffff';
const TOOLTIP_SECONDARY_COLOR = '#aaaaaa';
const TOOLTIP_WIDTH = '280px';
const TOOLTIP_BORDER_RADIUS = '6px';
const TOOLTIP_SHADOW = '0 4px 16px rgba(0, 0, 0, 0.5)';
const TOOLTIP_PADDING = '12px';
const TOOLTIP_Z_INDEX = 2000;

// Constants for positioning
const POSITION_ABOVE = 'above';
const POSITION_BELOW = 'below';
const POSITION_LEFT = 'left';
const POSITION_RIGHT = 'right';

/**
 * Component to display enhanced tooltips for KPIs.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.kpi - The KPI data object to display information about
 * @param {HTMLElement} props.anchorEl - The element to anchor the tooltip to
 * @param {boolean} props.open - Whether the tooltip is visible
 * @param {function} props.onClose - Function to call when tooltip should close
 * @param {string} props.position - Preferred position of tooltip (above, below, left, right)
 * @param {string} props.className - Additional CSS class names
 * @returns {JSX.Element|null} The rendered component or null if not open
 */
const KpiTooltip = ({ 
  kpi, 
  anchorEl, 
  open, 
  onClose,
  position = POSITION_ABOVE,
  className = '' 
}) => {
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [computedPosition, setComputedPosition] = useState(position);
  const [isPositioned, setIsPositioned] = useState(false);
  const tooltipRef = useRef(null);
  
  // Generate a unique instance ID for logging
  const instanceId = useRef(`kpi-tooltip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
  
  // Log component mount and unmount
  useEffect(() => {
    if (open) {
      try {
        log.debug(`KpiTooltip opened: ${kpi?.name || 'unknown'} (${instanceId.current})`);
        console.log(`KpiTooltip opened for: ${kpi?.name || 'unknown'}, kpi data:`, kpi);
      } catch (e) {
        console.log(`KpiTooltip opened: ${kpi?.name || 'unknown'} (${instanceId.current})`);
      }
    }
    
    return () => {
      if (open) {
        try {
          log.debug(`KpiTooltip closing: ${kpi?.name || 'unknown'} (${instanceId.current})`);
        } catch (e) {
          console.log(`KpiTooltip closing: ${kpi?.name || 'unknown'} (${instanceId.current})`);
        }
      }
    };
  }, [open, kpi?.name]);
  
  // Close on escape key
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && open && onClose) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscKey, { passive: true });
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open, onClose]);
  
  // Close on outside click - but not when clicking on the tooltip itself
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        open && 
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target) && 
        anchorEl && 
        !anchorEl.contains(event.target) &&
        onClose
      ) {
        onClose();
      }
    };
    
    // Use mousedown instead of click for better responsiveness
    document.addEventListener('mousedown', handleOutsideClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open, anchorEl, onClose]);
  
  // Calculate position when anchor element or preferred position changes
  useEffect(() => {
    if (!open || !anchorEl) return;
    
    const calculatePosition = () => {
      const anchorRect = anchorEl.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      
      if (!tooltipRect) {
        console.log("Tooltip element not available for positioning", tooltipRef.current);
        return;
      }
      
      console.log(`Positioning tooltip - anchor rect:`, anchorRect);
      
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // Default to preferred position
      let bestPosition = position;
      
      // Check if tooltip fits in preferred position
      const fitsAbove = anchorRect.top > tooltipRect.height + 10;
      const fitsBelow = windowHeight - anchorRect.bottom > tooltipRect.height + 10;
      const fitsLeft = anchorRect.left > tooltipRect.width + 10;
      const fitsRight = windowWidth - anchorRect.right > tooltipRect.width + 10;
      
      // Find best position if preferred doesn't fit
      if (bestPosition === POSITION_ABOVE && !fitsAbove) {
        bestPosition = fitsBelow ? POSITION_BELOW : (fitsRight ? POSITION_RIGHT : POSITION_LEFT);
      } else if (bestPosition === POSITION_BELOW && !fitsBelow) {
        bestPosition = fitsAbove ? POSITION_ABOVE : (fitsRight ? POSITION_RIGHT : POSITION_LEFT);
      } else if (bestPosition === POSITION_LEFT && !fitsLeft) {
        bestPosition = fitsRight ? POSITION_RIGHT : (fitsAbove ? POSITION_ABOVE : POSITION_BELOW);
      } else if (bestPosition === POSITION_RIGHT && !fitsRight) {
        bestPosition = fitsLeft ? POSITION_LEFT : (fitsAbove ? POSITION_ABOVE : POSITION_BELOW);
      }
      
      // Calculate position based on best fit
      let top, left;
      
      if (bestPosition === POSITION_ABOVE) {
        top = anchorRect.top - tooltipRect.height - 10;
        left = anchorRect.left + (anchorRect.width / 2) - (tooltipRect.width / 2);
      } else if (bestPosition === POSITION_BELOW) {
        top = anchorRect.bottom + 10;
        left = anchorRect.left + (anchorRect.width / 2) - (tooltipRect.width / 2);
      } else if (bestPosition === POSITION_LEFT) {
        top = anchorRect.top + (anchorRect.height / 2) - (tooltipRect.height / 2);
        left = anchorRect.left - tooltipRect.width - 10;
      } else if (bestPosition === POSITION_RIGHT) {
        top = anchorRect.top + (anchorRect.height / 2) - (tooltipRect.height / 2);
        left = anchorRect.right + 10;
      }
      
      // Ensure tooltip stays within viewport
      left = Math.max(10, Math.min(windowWidth - tooltipRect.width - 10, left));
      top = Math.max(10, Math.min(windowHeight - tooltipRect.height - 10, top));
      
      // Log final positioning
      console.log(`Tooltip final position: ${bestPosition}, top: ${top}px, left: ${left}px`);
      
      setTooltipPosition({ top, left });
      setComputedPosition(bestPosition);
      setIsPositioned(true);
    };
    
    // Calculate position after a short delay to ensure tooltip is rendered
    const timer = setTimeout(calculatePosition, 10);
    
    // Recalculate on window resize
    window.addEventListener('resize', calculatePosition, { passive: true });
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [open, anchorEl, position]);
  
  // Render nothing if not open
  if (!open || !kpi) {
    return null;
  }
  
  /**
   * Renders the tooltip content based on KPI type
   * 
   * @returns {JSX.Element} The rendered tooltip content
   */
  const renderTooltipContent = () => {
    // Get KPI group to determine content style
    const kpiGroup = kpi.group || '';
    
    return (
      <div className="tooltip-content">
        <div className="tooltip-header">
          <h3 className="tooltip-title">{kpi.name}</h3>
          {kpi.value && (
            <div className="tooltip-value">
              {typeof kpi.value === 'object' && kpi.value.formatted_value 
                ? kpi.value.formatted_value 
                : typeof kpi.value === 'object'
                  ? JSON.stringify(kpi.value)
                  : kpi.value}
            </div>
          )}
        </div>
        
        {kpi.description && (
          <div className="tooltip-description">
            {kpi.description}
          </div>
        )}
        
        {/* Render trend information if available */}
        {kpi.trend !== undefined && (
          <div className={`tooltip-trend ${kpi.trend > 0 ? 'positive' : kpi.trend < 0 ? 'negative' : 'neutral'}`}>
            <span className="trend-icon">
              {kpi.trend > 0 ? '↑' : kpi.trend < 0 ? '↓' : '→'}
            </span>
            <span className="trend-label">
              {kpi.trend_label || `${Math.abs(kpi.trend * 100).toFixed(2)}%`}
            </span>
          </div>
        )}
        
        {/* Group-specific additional information */}
        {kpiGroup === 'price' && renderPriceInfo()}
        {kpiGroup === 'volume' && renderVolumeInfo()}
        {kpiGroup === 'volatility' && renderVolatilityInfo()}
        {kpiGroup === 'fundamental' && renderFundamentalInfo()}
        {kpiGroup === 'sentiment' && renderSentimentInfo()}
        
        {/* Secondary value if available */}
        {kpi.secondary_value && (
          <div className="tooltip-secondary">
            <span className="secondary-label">{kpi.secondary_label || 'Additional Info'}: </span>
            <span className="secondary-value">
              {typeof kpi.secondary_value === 'object' 
                ? (kpi.secondary_value.formatted_value || JSON.stringify(kpi.secondary_value)) 
                : kpi.secondary_value}
            </span>
          </div>
        )}
      </div>
    );
  };
  
  /**
   * Renders additional information for price-related KPIs
   * 
   * @returns {JSX.Element|null} The rendered price info or null
   */
  const renderPriceInfo = () => {
    if (!kpi.name) return null;
    
    // Add specific info based on price metric name
    if (kpi.name.includes('Change')) {
      return (
        <div className="tooltip-info-section">
          <p>Price change reflects movement since the previous day's close.</p>
        </div>
      );
    }
    
    return null;
  };
  
  /**
   * Renders additional information for volume-related KPIs
   * 
   * @returns {JSX.Element|null} The rendered volume info or null
   */
  const renderVolumeInfo = () => {
    if (!kpi.name) return null;
    
    if (kpi.name.includes('Volume Ratio')) {
      return (
        <div className="tooltip-info-section">
          <p>Volume ratio greater than 1.0 indicates higher than average trading activity.</p>
          <ul className="tooltip-scale">
            <li className="positive">{'>'} 2.0: Extremely high volume</li>
            <li className="positive">1.5 - 2.0: High volume</li>
            <li className="neutral">0.8 - 1.5: Normal volume</li>
            <li className="negative">{'<'} 0.8: Low volume</li>
          </ul>
        </div>
      );
    }
    
    return null;
  };
  
  /**
   * Renders additional information for volatility-related KPIs
   * 
   * @returns {JSX.Element|null} The rendered volatility info or null
   */
  const renderVolatilityInfo = () => {
    if (!kpi.name) return null;
    
    if (kpi.name.includes('Beta')) {
      return (
        <div className="tooltip-info-section">
          <p>Beta measures stock's volatility relative to the market.</p>
          <ul className="tooltip-scale">
            <li className="negative">{'>'} 1.5: Significantly more volatile</li>
            <li className="neutral">1.0 - 1.5: More volatile than market</li>
            <li className="neutral">0.5 - 1.0: Less volatile than market</li>
            <li className="positive">{'<'} 0.5: Much less volatile</li>
          </ul>
        </div>
      );
    }
    
    if (kpi.name.includes('Volatility')) {
      return (
        <div className="tooltip-info-section">
          <p>Historical volatility represents the annualized standard deviation of daily returns.</p>
          <p>Higher values indicate greater price fluctuations.</p>
        </div>
      );
    }
    
    return null;
  };
  
  /**
   * Renders additional information for fundamental-related KPIs
   * 
   * @returns {JSX.Element|null} The rendered fundamental info or null
   */
  const renderFundamentalInfo = () => {
    if (!kpi.name) return null;
    
    if (kpi.name.includes('P/E')) {
      return (
        <div className="tooltip-info-section">
          <p>Price-to-Earnings ratio reflects how much investors are willing to pay per dollar of earnings.</p>
          <p>Lower P/E may indicate undervaluation, but also consider industry averages and growth prospects.</p>
        </div>
      );
    }
    
    if (kpi.name.includes('Debt-to-Equity')) {
      return (
        <div className="tooltip-info-section">
          <p>Debt-to-Equity measures the relative proportion of shareholder equity and debt used to finance assets.</p>
          <ul className="tooltip-scale">
            <li className="positive">{'<'} 0.5: Low leverage</li>
            <li className="neutral">0.5 - 1.0: Moderate leverage</li>
            <li className="neutral">1.0 - 2.0: High leverage</li>
            <li className="negative">{'>'} 2.0: Very high leverage</li>
          </ul>
        </div>
      );
    }
    
    if (kpi.name.includes('ROE')) {
      return (
        <div className="tooltip-info-section">
          <p>Return on Equity measures a company's profitability relative to shareholders' equity.</p>
          <p>Higher values indicate more efficient use of equity capital.</p>
        </div>
      );
    }
    
    if (kpi.name.includes('Dividend Yield')) {
      return (
        <div className="tooltip-info-section">
          <p>Dividend Yield represents annual dividend payments relative to share price.</p>
          <p>Higher yields provide more income, but may indicate limited growth prospects or unsustainable payouts.</p>
        </div>
      );
    }
    
    return null;
  };
  
  /**
   * Renders additional information for sentiment-related KPIs
   * 
   * @returns {JSX.Element|null} The rendered sentiment info or null
   */
  const renderSentimentInfo = () => {
    if (!kpi.name) return null;
    
    if (kpi.name.includes('Sentiment')) {
      return (
        <div className="tooltip-info-section">
          <p>Sentiment scores reflect market perception based on news, social media, and analyst reports.</p>
          <p>These should be considered alongside fundamental and technical indicators.</p>
        </div>
      );
    }
    
    return null;
  };
  
  // Tooltip arrow direction based on position
  const getArrowClass = () => {
    switch (computedPosition) {
      case POSITION_ABOVE: return 'arrow-bottom';
      case POSITION_BELOW: return 'arrow-top';
      case POSITION_LEFT: return 'arrow-right';
      case POSITION_RIGHT: return 'arrow-left';
      default: return '';
    }
  };
  
  // Show tooltip with animation only after position is calculated
  const visibilityClass = isPositioned ? 'visible' : '';
  
  return (
    <div 
      className={`kpi-tooltip ${className} ${getArrowClass()} ${visibilityClass}`}
      style={{ 
        top: `${tooltipPosition.top}px`, 
        left: `${tooltipPosition.left}px`,
        zIndex: TOOLTIP_Z_INDEX
      }}
      ref={tooltipRef}
      onClick={(e) => e.stopPropagation()} // Prevent click from closing the tooltip
    >
      {renderTooltipContent()}
      
      {/* Close button */}
      <button className="close-button" onClick={onClose}>×</button>
      
      {/* Styled JSX */}
      <style jsx>{`
        .kpi-tooltip {
          position: fixed;
          width: ${TOOLTIP_WIDTH};
          background-color: ${TOOLTIP_BG_COLOR};
          color: ${TOOLTIP_TEXT_COLOR};
          border: 1px solid ${TOOLTIP_BORDER_COLOR};
          border-radius: ${TOOLTIP_BORDER_RADIUS};
          box-shadow: ${TOOLTIP_SHADOW};
          padding: ${TOOLTIP_PADDING};
          z-index: ${TOOLTIP_Z_INDEX};
          font-size: 14px;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, transform 0.2s ease;
          pointer-events: auto;
        }
        
        .kpi-tooltip.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        
        .close-button {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
          border: none;
          border-radius: 50%;
          color: #aaa;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          transition: background-color 0.2s, color 0.2s;
        }
        
        .close-button:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }
        
        /* Arrow styles */
        .arrow-top::before {
          content: '';
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          border-width: 0 10px 10px;
          border-style: solid;
          border-color: transparent transparent ${TOOLTIP_BORDER_COLOR};
        }
        
        .arrow-bottom::before {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          border-width: 10px 10px 0;
          border-style: solid;
          border-color: ${TOOLTIP_BORDER_COLOR} transparent transparent;
        }
        
        .arrow-left::before {
          content: '';
          position: absolute;
          left: -10px;
          top: 50%;
          transform: translateY(-50%);
          border-width: 10px 10px 10px 0;
          border-style: solid;
          border-color: transparent ${TOOLTIP_BORDER_COLOR} transparent transparent;
        }
        
        .arrow-right::before {
          content: '';
          position: absolute;
          right: -10px;
          top: 50%;
          transform: translateY(-50%);
          border-width: 10px 0 10px 10px;
          border-style: solid;
          border-color: transparent transparent transparent ${TOOLTIP_BORDER_COLOR};
        }
        
        /* Content styles */
        .tooltip-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          padding-right: 16px; /* Make room for close button */
        }
        
        .tooltip-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .tooltip-value {
          font-weight: 700;
          font-size: 16px;
        }
        
        .tooltip-description {
          margin: 0 0 8px;
          font-size: 14px;
          color: ${TOOLTIP_SECONDARY_COLOR};
          line-height: 1.4;
        }
        
        .tooltip-trend {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 13px;
          width: fit-content;
        }
        
        .tooltip-trend.positive {
          background-color: rgba(76, 175, 80, 0.2);
          color: #4caf50;
        }
        
        .tooltip-trend.negative {
          background-color: rgba(244, 67, 54, 0.2);
          color: #f44336;
        }
        
        .tooltip-trend.neutral {
          background-color: rgba(120, 144, 156, 0.2);
          color: #78909c;
        }
        
        .tooltip-info-section {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 13px;
        }
        
        .tooltip-info-section p {
          margin: 0 0 8px;
          line-height: 1.4;
        }
        
        .tooltip-scale {
          margin: 8px 0 0;
          padding: 0;
          list-style: none;
          font-size: 12px;
        }
        
        .tooltip-scale li {
          margin-bottom: 4px;
          padding-left: 16px;
          position: relative;
        }
        
        .tooltip-scale li::before {
          content: '•';
          position: absolute;
          left: 4px;
        }
        
        .tooltip-scale li.positive {
          color: #4caf50;
        }
        
        .tooltip-scale li.negative {
          color: #f44336;
        }
        
        .tooltip-scale li.neutral {
          color: #78909c;
        }
        
        .tooltip-secondary {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 13px;
        }
        
        .secondary-label {
          color: ${TOOLTIP_SECONDARY_COLOR};
        }
        
        .secondary-value {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default KpiTooltip;
