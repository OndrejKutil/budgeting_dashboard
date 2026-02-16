/**
 * Export API
 * Handles data export operations (CSV downloads)
 */

import { tokenManager } from '../client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export const exportApi = {
    downloadTransactionsCSV: async () => {
        const accessToken = tokenManager.getAccessToken();

        const response = await fetch(`${API_BASE_URL}/export/transactions`, {
            method: 'GET',
            headers: {
                'X-API-KEY': API_KEY,
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
        });

        if (!response.ok) {
            throw new Error('Failed to export transactions');
        }

        // Get filename from Content-Disposition header or use default
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'transactions_export.csv';
        if (disposition) {
            const match = disposition.match(/filename="?([^"]+)"?/);
            if (match) filename = match[1];
        }

        // Create blob and trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },
};
