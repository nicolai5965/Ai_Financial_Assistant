/**
 * KpiGroup component for displaying a group of related KPIs.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import KpiCard from './KpiCard';
import { logger } from '../../../utils/logger';

const safeLogger = {
  debug: (message) => console.log(`[DEBUG] ${message}`),
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

const log = typeof logger !== 'undefined' ? logger : safeLogger;

const GROUP_BG_COLOR = '#111111';
const GROUP_BORDER_COLOR = '#333333';
const GROUP_HEADER_BG_COLOR = '#222222';
const GROUP_TITLE_COLOR = '#ffffff';
const GROUP_DESCRIPTION_COLOR = '#a0a0a0';
const BORDER_RADIUS = '6px';

const KpiGroup = React.memo(({  
  group,
  isLoading = false,
  onKpiClick = null,
  activeKpi = null,
  initiallyExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const instanceId = useRef(`kpi-group-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);

  useEffect(() => {
    log.debug(`KpiGroup: KpiGroup mounted: ${group?.title || 'unknown'} (${instanceId.current})`);
    return () => log.debug(`KpiGroup: KpiGroup unmounting: ${group?.title || 'unknown'} (${instanceId.current})`);
  }, [group?.title, instanceId]);

  if (!group && !isLoading) {
    return null;
  }

  const toggleExpanded = useCallback(() => {
    log.debug(`KpiGroup: Toggling group expansion: ${group?.title || 'unknown'} (${instanceId.current})`);
    setIsExpanded(!isExpanded);
  }, [group?.title, instanceId, isExpanded]);

  const renderKpiCards = () => {
    if (isLoading) {
      return Array(4).fill(0).map((_, index) => (
        <KpiCard key={`loading-${index}`} isLoading={true} />
      ));
    }

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

    return kpiItems.map((kpi) => { // Removed index from key
      const updatedKpi = { ...kpi, group: kpi.group || group.group }; // Ensure group is set
      const isActive = activeKpi === kpi.name;

      return (
        <KpiCard
          key={kpi.name} // Use kpi.name as key
          kpi={updatedKpi}
          onClick={onKpiClick}
          initialTooltipVisible={isActive}
        />
      );
    });
  };

  return (
    <div className="kpi-group">
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

      {isExpanded && (
        <div className="group-content">
          <div className="kpi-cards-container">
            {renderKpiCards()}
          </div>
        </div>
      )}

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
});

export default React.memo(KpiGroup);