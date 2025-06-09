import React from 'react';

/**
 * A component to display pagination controls.
 * @param {Object} props - The component props.
 * @param {number} props.currentPage - The current active page.
 * @param {number} props.totalPages - The total number of pages available.
 * @param {Function} props.onPageChange - The callback function to execute when a page is changed.
 */
const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) {
        return null; // Don't render controls if there's only one page
    }

    return (
        <>
            <div className="pagination-controls">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                >
                    &larr; Previous
                </button>
                <span>
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                >
                    Next &rarr;
                </button>
            </div>
            <style jsx>{`
                .pagination-controls {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 1rem;
                    margin-top: 1rem;
                }

                .pagination-controls button {
                    background-color: #37474f;
                    color: #eceff1;
                    border: 1px solid #4dd0e1;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s, color 0.2s;
                }

                .pagination-controls button:hover:not(:disabled) {
                    background-color: #4dd0e1;
                    color: #263238;
                }

                .pagination-controls button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </>
    );
};

export default PaginationControls; 