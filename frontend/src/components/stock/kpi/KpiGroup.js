/**
 * KpiGroup component for displaying a group of related KPIs.
 * 
 * This component renders a collapsible section containing multiple KPI cards
 * organized by category.
 */

import React, { useState } from 'react';
import KpiCard from './KpiCard';
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

// Constants for styling
const GROUP_BG_COLOR = '#111111';
const GROUP_BORDER_COLOR = '#333333';
const GROUP_HEADER_BG_COLOR = '#222222';
const GROUP_TITLE_COLOR = '#ffffff';
const GROUP_DESCRIPTION_COLOR = '#a0a0a0';
const BORDER_RADIUS = '6px';

/**
 * Component to display a group of related KPIs.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.group - The KPI group data object
 * @param {boolean} props.isLoading - Whether the group is currently loading
 * @param {Function} props.onKpiClick - Optional click handler for KPI cards
 * @param {string} props.activeKpi - Name of the KPI with an active tooltip
 * @param {boolean} props.initiallyExpanded - Whether the group is initially expanded
 * @returns {JSX.Element} The rendered component
 */
const KpiGroup = ({ 
  group, 
  isLoading = false, 
  onKpiClick = null,
  activeKpi = null,
  initiallyExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  
  // Generate a unique instance ID for logging
  const instanceId = React.useRef(`kpi-group-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
  
  // Log component mount and unmount
  React.useEffect(() => {
    try {
      log.debug(`KpiGroup mounted: ${group?.title || 'unknown'} (${instanceId.current})`);
      if (group) {
        console.log(`KpiGroup data:`, group);
      }
    } catch (e) {
      console.log(`KpiGroup mounted: ${group?.title || 'unknown'} (${instanceId.current})`);
    }
    
    return () => {
      try {
        log.debug(`KpiGroup unmounting: ${group?.title || 'unknown'} (${instanceId.current})`);
      } catch (e) {
        console.log(`KpiGroup unmounting: ${group?.title || 'unknown'} (${instanceId.current})`);
      }
    };
  }, [group?.title, group]);
  
  // Handle null or undefined group
  if (!group && !isLoading) {
    return null;
  }
  
  // Toggle expanded state
  const toggleExpanded = () => {
    try {
      log.debug(`Toggling group expansion: ${group?.title || 'unknown'} (${instanceId.current})`);
    } catch (e) {
      console.log(`Toggling group expansion: ${group?.title || 'unknown'} (${instanceId.current})`);
    }
    setIsExpanded(!isExpanded);
  };
  
  // Create KPI cards
  const renderKpiCards = () => {
    if (isLoading) {
      // Create loading placeholder cards
      return Array(4).fill(0).map((_, index) => (
        <KpiCard key={`loading-${index}`} isLoading={true} />
      ));
    }
    
    // Handle both 'kpis' and 'metrics' field names for backward compatibility
    const kpiItems = group?.metrics || group?.kpis || [];
    
    if (!group || kpiItems.length === 0) {
      console.log(`No KPIs available in group:`, group);
      return (
        <div className="empty-state">
          No KPIs available in this group
        </div>
      );
    }
    
    console.log(`Rendering ${kpiItems.length} KPI cards for group ${group.title || group.group}`);
    
    return kpiItems.map((kpi, index) => {
      // Make sure group is added to the KPI object for the tooltip to use
      if (!kpi.group && group.group) {
        kpi.group = group.group;
      }
      
      // Check if this KPI should show its tooltip
      const isActive = activeKpi === kpi.name;
      
      return (
        <KpiCard
          key={`${kpi.name}-${index}`}
          kpi={kpi}
          onClick={onKpiClick}
          initialTooltipVisible={isActive}
        />
      );
    });
  };
  
  return (
    <div className="kpi-group">
      {/* Group header */}
      <div className="group-header" onClick={toggleExpanded}>
        <div className="group-title-container">
          <h3 className="group-title">
            {isLoading ? 'Loading...' : (group?.title || 'Unknown Group')}
          </h3>
          <span className="expand-icon">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
        
        {group?.description && (
          <p className="group-description">
            {group.description}
          </p>
        )}
      </div>
      
      {/* Collapsible content */}
      {isExpanded && (
        <div className="group-content">
          <div className="kpi-cards-container">
            {renderKpiCards()}
          </div>
        </div>
      )}
      
      {/* Styled JSX */}
      <style jsx>{`
        .kpi-group {
          background-color: ${GROUP_BG_COLOR};
          border-radius: ${BORDER_RADIUS};
          border: 1px solid ${GROUP_BORDER_COLOR};
          margin-bottom: 16px;
          overflow: hidden;
        }
        
        .group-header {
          background-color: ${GROUP_HEADER_BG_COLOR};
          padding: 10px 16px;
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s ease;
        }
        
        .group-header:hover {
          background-color: #2a2a2a;
        }
        
        .group-title-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .group-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: ${GROUP_TITLE_COLOR};
        }
        
        .expand-icon {
          font-size: 12px;
          margin-left: 8px;
          color: ${GROUP_DESCRIPTION_COLOR};
        }
        
        .group-description {
          margin: 4px 0 0;
          font-size: 12px;
          color: ${GROUP_DESCRIPTION_COLOR};
        }
        
        .group-content {
          padding: 16px;
        }
        
        .kpi-cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 16px;
        }
        
        .empty-state {
          padding: 16px;
          text-align: center;
          color: ${GROUP_DESCRIPTION_COLOR};
          font-style: italic;
        }
        
        @media (max-width: 640px) {
          .kpi-cards-container {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 12px;
          }
          
          .group-content {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default KpiGroup;
