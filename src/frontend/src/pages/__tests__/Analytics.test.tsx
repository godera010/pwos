import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Analytics } from '../Analytics';
import { api } from '../../services/api';
import React from 'react';

// Mock the API service
vi.mock('../../services/api', () => ({
    api: {
        getHistory: vi.fn().mockResolvedValue([]),
        getWateringEvents: vi.fn().mockResolvedValue([]),
        getStatistics: vi.fn().mockResolvedValue({
            total_waterings: 250,
            avg_moisture: 45,
            total_ml_decisions: 1000
        })
    }
}));

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('Analytics Page', () => {
    it('renders the header and sets initial state', async () => {
        render(<Analytics />);
        expect(screen.getByText('System Analytics')).toBeDefined();

        // Verify time selectors render correctly
        expect(screen.getByText('1H')).toBeDefined();
        expect(screen.getByText('24H')).toBeDefined();
        expect(screen.getByText('30D')).toBeDefined();
    });

    it('loads and displays KPI statistics from API', async () => {
        render(<Analytics />);

        // Wait for stats to load into the DOM
        await waitFor(() => {
            expect(screen.getByText('250')).toBeDefined(); // Total Waterings
            expect(screen.getByText('45%')).toBeDefined(); // Avg Moisture
            expect(screen.getByText('1000')).toBeDefined(); // ML Decisions
        });
    });

    it('triggers API call when time range is changed', async () => {
        render(<Analytics />);

        // Clear mock from initial render
        vi.mocked(api.getHistory).mockClear();

        const button7d = screen.getByText('7D');
        fireEvent.click(button7d);

        await waitFor(() => {
            expect(api.getHistory).toHaveBeenCalled();
        });
    });
});
