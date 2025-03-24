/**
 * KpiDashboard component for managing and displaying all KPI groups.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import KpiGroup from './KpiGroup';
import { logger } from '../../../utils/logger';

const safeLogger = {
    debug: (message) => console.log(`[DEBUG] ${message}`),
    info: (message) => console.log(`[INFO] ${message}`),
    warn: (message) => console.warn(`[WARN] ${message}`),
    error: (message) => console.error(`[ERROR] ${message}`)
};

const log = typeof logger !== 'undefined' ? logger : safeLogger;

const DASHBOARD_PADDING = '16px';
const DASHBOARD_BG_COLOR = 'transparent';
const NO_DATA_COLOR = '#a0a0a0';
const ERROR_COLOR = '#f44336';
const BUTTON_BG_COLOR = '#2a2a2a';
const BUTTON_HOVER_BG_COLOR = '#3a3a3a';
const BUTTON_TEXT_COLOR = '#ffffff';

const KpiDashboard = ({
    kpiData,
    isLoading = false,
    onRefresh = null,
    onKpiClick = null,
    viewPreferences = {}
}) => {
    const [activeKpi, setActiveKpi] = useState(null);
    const instanceId = useRef(`kpi-dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);

    // Mount/Unmount Logging
    useEffect(() => {
        log.debug(`KpiDashboard: KpiDashboard mounted (${instanceId.current})`);
        return () => log.debug(`KpiDashboard: KpiDashboard unmounting (${instanceId.current})`);
    }, []);

    // useCallback for Handlers
    const handleRefreshClick = useCallback(() => {
        setActiveKpi(null); // Clear active tooltip
        if (onRefresh) {
            log.debug(`KpiDashboard: KpiDashboard: Refresh requested (${instanceId.current})`);
            onRefresh();
        }
    }, [onRefresh, instanceId]);

    const handleKpiClick = useCallback((kpi) => {
        console.log(`KpiDashboard: KPI clicked in dashboard: ${kpi?.name}`, kpi);
        setActiveKpi(activeKpi === kpi.name ? null : kpi.name);
        if (onKpiClick) {
            onKpiClick(kpi);
        }
    }, [activeKpi, onKpiClick]);

    // useMemo for KPI Groups - compute based solely on the API data
    const kpiGroups = useMemo(() => {
        if (isLoading || !kpiData || kpiData.error) return [];

        const groupsData = kpiData.kpi_data?.kpi_groups || {};
        // Convert the groups data to a string for dependency tracking
        const groupsDataString = JSON.stringify(groupsData);
        console.log("KpiDashboard: groupsDataString:", groupsDataString);

        return Object.values(groupsData);
    }, [isLoading, JSON.stringify(kpiData?.kpi_data?.kpi_groups || {})]);

    // Filter groups based on viewPreferences.
    // Previously, an empty array (meaning no groups selected) would fall back to returning all groups.
    // Now, if visibleGroups exists, we filter (even if empty), so deselecting all groups returns an empty array.
    const visibleGroups = useMemo(() => {
        console.log("KpiDashboard: viewPreferences:", viewPreferences);
        console.log("KpiDashboard: kpiGroups:", kpiGroups);

        if (Array.isArray(viewPreferences.visibleGroups)) {
            return kpiGroups.filter(group => viewPreferences.visibleGroups.includes(group.group));
        }
        return kpiGroups;
    }, [kpiGroups, viewPreferences]);
    console.log("KpiDashboard: visibleGroups:", visibleGroups);

    const hasError = kpiData?.error;

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="loading-groups">
                    <KpiGroup isLoading={true} />
                    <KpiGroup isLoading={true} />
                </div>
            );
        }

        if (hasError) {
            return (
                <div className="error-message">
                    <p>Error loading KPI data: {kpiData?.error || 'Unknown error'}</p>
                    <button className="retry-button" onClick={handleRefreshClick}>
                        Retry
                    </button>
                </div>
            );
        }
        if (!visibleGroups || visibleGroups.length === 0) {
            return (
                <div className="no-data-message">
                    <p>No KPI groups selected.</p>
                </div>
            );
        }

        console.log(`KpiDashboard: Rendering ${visibleGroups.length} KPI groups`);

        return visibleGroups.map((group) => {
            if (!group) return null;
            return (
                <KpiGroup
                    key={group.group}
                    group={group}
                    onKpiClick={handleKpiClick}
                    activeKpi={activeKpi}
                    initiallyExpanded={
                        viewPreferences?.expandedGroups
                            ? viewPreferences.expandedGroups.includes(group.group)
                            : true
                    }
                />
            );
        });
    };

    return (
        <div className="kpi-dashboard">
            <div className="dashboard-header">
                <h2 className="dashboard-title">
                    Key Performance Indicators
                    {kpiData?.data?.ticker ? ` - ${kpiData.data.ticker}` : ''}
                </h2>
                {onRefresh && (
                    <button
                        className="refresh-button"
                        onClick={handleRefreshClick}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : 'Refresh'}
                    </button>
                )}
            </div>
            <div className="dashboard-content">
                {renderContent()}
            </div>
            <style jsx>{`
                .kpi-dashboard {
                    width: 100%;
                    padding: ${DASHBOARD_PADDING};
                    background-color: ${DASHBOARD_BG_COLOR};
                }

                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .dashboard-title {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #ffffff;
                }

                .refresh-button, .retry-button {
                    background-color: ${BUTTON_BG_COLOR};
                    color: ${BUTTON_TEXT_COLOR};
                    border: none;
                    border-radius: 4px;
                    padding: 8px 16px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }

                .refresh-button:hover, .retry-button:hover {
                    background-color: ${BUTTON_HOVER_BG_COLOR};
                }

                .refresh-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .dashboard-content {
                    display: flex;
                    flex-direction: column;
                }

                .loading-groups, .no-data-message, .error-message {
                    width: 100%;
                }

                .no-data-message, .error-message {
                    text-align: center;
                    padding: 32px 16px;
                    background-color: #1a1a1a;
                    border-radius: 6px;
                    margin-bottom: 16px;
                }

                .no-data-message p {
                    color: ${NO_DATA_COLOR};
                    margin-bottom: 16px;
                }

                .error-message p {
                    color: ${ERROR_COLOR};
                    margin-bottom: 16px;
                }
            `}</style>
        </div>
    );
};

export default React.memo(KpiDashboard);
