import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { fetchJournalTrades } from '../../services/api/journal';
import { logger } from '../../utils/logger';

// Import the refactored components
import JournalTable from '../../components/journal/JournalTable';
import PaginationControls from '../../components/journal/PaginationControls';
import TradeSubmissionForm from '../../components/journal/TradeSubmissionForm';

// --- Helper Functions and Components ---

/**
 * Formats a date string or timestamp into a more readable format.
 * @param {string} dateString - The ISO 8601 date string.
 * @returns {string} - Formatted date string, e.g., "2023-10-27 15:45:30".
 */
const formatTimestamp = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch (e) {
        logger.warn(`Could not format date: ${dateString}`, e);
        return dateString;
    }
};

/**
 * Formats a number as a currency string (USD).
 * @param {number} value - The number to format.
 * @returns {string} - Formatted currency string, e.g., "$1,234.56".
 */
const formatCurrency = (value) => {
    if (typeof value !== 'number') return 'N/A';
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// --- Main Page Component ---

const JournalPage = () => {
    const [trades, setTrades] = useState([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 20
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormVisible, setIsFormVisible] = useState(false);

    const loadTrades = async (page) => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchJournalTrades({ page, limit: pagination.limit });
            if (data.error) {
                throw new Error(data.message);
            }
            setTrades(data.trades);
            setPagination(prev => ({
                ...prev,
                currentPage: data.page,
                totalPages: data.total_pages,
                totalCount: data.total_count,
            }));
        } catch (err) {
            logger.error("Failed to load journal trades:", err);
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTrades(pagination.currentPage);
    }, [pagination.currentPage]); // Removed pagination.limit to prevent double-fetch on init

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    /**
     * Callback function for when a new trade is successfully submitted.
     * It adds the new trade to the top of the list for immediate feedback.
     * @param {Object} newTrade - The new trade object returned from the API.
     */
    const handleTradeSubmitted = (newTrade) => {
        // To avoid showing duplicates if the user is on the first page,
        // we can just reload the current page. This is the simplest approach.
        // A more complex approach would be to check if the newTrade.id is already in the list.
        logger.info("New trade received, reloading current page to display it.");
        setIsFormVisible(false); // Hide the form on success
        loadTrades(pagination.currentPage);
    };

    return (
        <>
            <Head>
                <title>Trading Journal | Ai Financial Assistant</title>
                <meta name="description" content="View and analyze your trading journal entries." />
            </Head>
            <div className="journal-page">
                <div className="journal-header">
                    <div className="journal-title">
                        <h1>Trading Journal</h1>
                        <p>A log of all processed trading activities. ({pagination.totalCount} total entries)</p>
                    </div>
                    {!isFormVisible && (
                        <div className="journal-actions">
                            <button onClick={() => setIsFormVisible(true)} className="add-trade-btn">
                                Add New Trade
                            </button>
                        </div>
                    )}
                </div>

                {isFormVisible && (
                    <TradeSubmissionForm
                        onTradeSubmitted={handleTradeSubmitted}
                        onClose={() => setIsFormVisible(false)}
                    />
                )}
                
                {error && <div className="error-message">Error: {error}</div>}

                <JournalTable trades={trades} isLoading={loading} />

                <PaginationControls
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            </div>
            <style jsx global>{`
                /* Global styles for the page layout */
                .journal-page {
                    padding: 2rem;
                    color: #e0e0e0;
                    max-width: 1600px;
                    margin: 0 auto;
                }

                .journal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid #37474f;
                }
                
                .journal-title h1 {
                    color: #4dd0e1; /* Light Cyan */
                    margin: 0;
                }

                .journal-title p {
                    margin: 0.25rem 0 0;
                    color: #b0bec5;
                    font-size: 15px;
                }

                .add-trade-btn {
                    background-color: #4dd0e1;
                    color: #1c272c;
                    border: none;
                    padding: 12px 24px;
                    font-size: 16px;
                    font-weight: bold;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .add-trade-btn:hover {
                    background-color: #80deea;
                }

                .error-message {
                    text-align: center;
                    padding: 2rem;
                    font-size: 1.2rem;
                    color: #ef5350; /* Light Red */
                    border: 1px solid #ef5350;
                    background-color: rgba(239, 83, 80, 0.1);
                    border-radius: 4px;
                }
            `}</style>
        </>
    );
};

export default JournalPage; 