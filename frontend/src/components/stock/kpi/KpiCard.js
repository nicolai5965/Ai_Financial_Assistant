/**
 * KpiCard component for displaying an individual KPI.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { logger } from '../../../utils/logger';
import KpiTooltip from './KpiTooltip';

const safeLogger = {
  debug: (message) => console.log(`[DEBUG] ${message}`),
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

const log = typeof logger !== 'undefined' ? logger : safeLogger;

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

const KpiCard = React.memo(({ // Wrap with React.memo
  kpi,
  isLoading = false,
  onClick = null,
  initialTooltipVisible = false
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(initialTooltipVisible);
  const cardRef = useRef(null);
  const instanceId = useRef(`kpi-card-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);

  useEffect(() => {
    setTooltipVisible(initialTooltipVisible);
  }, [initialTooltipVisible]);

  useEffect(() => {
    log.debug(`KpiCard: KpiCard mounted: ${kpi?.name || 'unknown'} (${instanceId.current})`);
    return () => log.debug(`KpiCard: KpiCard unmounting: ${kpi?.name || 'unknown'} (${instanceId.current})`);
  }, [kpi?.name, instanceId]);

  if (!kpi && !isLoading) {
    return null;
  }

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

  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'object' && value.formatted_value) {
      return value.formatted_value;
    }
    if (typeof value === 'object') {
      try {
        console.log("KpiCard: Complex value in KpiCard:", value);
        return JSON.stringify(value);
      } catch (err) {
        console.error("KpiCard: Error stringifying value:", err);
        return 'Complex Value';
      }
    }
    return value;
  };

    // useCallback for handleClick
    const handleClick = useCallback(() => {
      if (isLoading) return;

      const newState = !tooltipVisible;
      log.debug(`KpiCard: KpiCard clicked: ${kpi?.name || 'unknown'} (${instanceId.current}), tooltip: ${newState}`);

      if (onClick && kpi) {
        onClick(kpi);
      }
  }, [isLoading, tooltipVisible, kpi, instanceId, onClick]);


  const handleCloseTooltip = useCallback(() => { // useCallback for handleCloseTooltip
    setTooltipVisible(false);
    if (onClick && kpi) {
      onClick(kpi);
    }
  }, [onClick, kpi]);

  return (
    <div
      className="kpi-card"
      ref={cardRef}
      onClick={handleClick}
    >
      {isLoading ? (
        <div className="loading-state">
          <div className="loading-line name-loading"></div>
          <div className="loading-line value-loading"></div>
        </div>
      ) : (
        <>
          <div className="kpi-name">{kpi?.name || 'N/A'}</div>
          <div className="kpi-value" style={{ color: getValueColor() }}>
            {formatValue(kpi?.value)}
          </div>

          {tooltipVisible && kpi && (
            <div className="tooltip-wrapper">
              <KpiTooltip
                kpi={kpi}
                anchorEl={cardRef.current}
                open={tooltipVisible}
                onClose={handleCloseTooltip}
                position="above"
              />
            </div>
          )}
        </>
      )}

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
          cursor: pointer;
          overflow: visible; /* Changed from hidden to allow tooltip to overflow */
        }

        .kpi-card:hover {
          background-color: ${CARD_HOVER_BG_COLOR};
          transform: translateY(-2px);
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

        .tooltip-wrapper {
          position: absolute;
          z-index: 1000;
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
});

export default React.memo(KpiCard);