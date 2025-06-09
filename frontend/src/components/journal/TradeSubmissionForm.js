import React, { useState } from 'react';
import { submitJournalTrade } from '../../services/api/journal';
import { logger } from '../../utils/logger';

/**
 * A form component for submitting new raw trade text to be processed.
 * @param {Object} props - The component props.
 * @param {Function} props.onTradeSubmitted - Callback function executed on successful submission.
 * @param {Function} props.onClose - Callback function to close/hide the form.
 */
const TradeSubmissionForm = ({ onTradeSubmitted, onClose }) => {
    const [rawText, setRawText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!rawText.trim()) {
            setError('Trade text cannot be empty.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const result = await submitJournalTrade(rawText);

            if (result.error) {
                throw new Error(result.message);
            }

            logger.info('Trade submitted successfully, calling parent handler.', result);
            onTradeSubmitted(result); // Pass the new trade object up to the parent
            setRawText(''); // Clear the form on success
        } catch (err) {
            logger.error('Failed to submit trade:', err);
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="submission-container">
                <div className="form-header">
                    <h2>Add New Trade</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Close form">&times;</button>
                </div>

                <p>Paste the raw trade log text below to have the AI process and add it to your journal.</p>
                <form onSubmit={handleSubmit}>
                    <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="Paste your raw trade log here..."
                        disabled={isSubmitting}
                        rows={10}
                    />
                    {error && <div className="error-message">{error}</div>}
                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="cancel-btn" disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Processing...' : 'Submit Trade'}
                        </button>
                    </div>
                </form>
            </div>
            <style jsx>{`
                .submission-container {
                    background-color: #263238; /* Blue Grey Dark */
                    padding: 1.5rem 2rem;
                    border-radius: 8px;
                    border: 1px solid #37474f;
                    margin-bottom: 2rem;
                    animation: fadeIn 0.3s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }

                h2 {
                    color: #4dd0e1; /* Light Cyan */
                    margin: 0;
                }

                .close-btn {
                    background: none;
                    border: none;
                    color: #b0bec5;
                    font-size: 2rem;
                    line-height: 1;
                    cursor: pointer;
                    padding: 0;
                }

                .close-btn:hover {
                    color: #fff;
                }

                p {
                    color: #b0bec5;
                    font-size: 15px;
                    margin-bottom: 1rem;
                }

                textarea {
                    width: 100%;
                    background-color: #1c272c;
                    border: 1px solid #455a64;
                    color: #eceff1;
                    border-radius: 4px;
                    padding: 10px;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 14px;
                    resize: vertical;
                    min-height: 150px;
                    margin-bottom: 1rem;
                }

                textarea:focus {
                    outline: none;
                    border-color: #4dd0e1;
                    box-shadow: 0 0 5px rgba(77, 208, 225, 0.5);
                }
                
                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    margin-top: 0.5rem; /* Reduced margin */
                }

                button {
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

                .cancel-btn {
                    background-color: #546e7a; /* Blue Grey */
                    color: #eceff1;
                }

                .cancel-btn:hover:not(:disabled) {
                    background-color: #78909c;
                }

                button:hover:not(:disabled) {
                    background-color: #80deea;
                }

                button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .error-message {
                    color: #ef5350; /* Light Red */
                    background-color: rgba(239, 83, 80, 0.1);
                    border: 1px solid #ef5350;
                    border-radius: 4px;
                    padding: 0.75rem;
                    margin-top: -0.5rem;
                    margin-bottom: 1rem;
                    font-size: 14px;
                }
            `}</style>
        </>
    );
};

export default TradeSubmissionForm; 