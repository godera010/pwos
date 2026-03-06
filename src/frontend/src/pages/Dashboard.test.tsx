import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Dashboard } from './Dashboard'; // Named export
import { MemoryRouter } from 'react-router-dom';

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock API
vi.mock('../services/api', () => ({
    api: {
        getLatestSensors: vi.fn().mockResolvedValue({ soil_moisture: 50, temperature: 25, humidity: 60 }),
        getWeatherForecast: vi.fn().mockResolvedValue({
            temperature: 25, humidity: 60, precipitation_chance: 10,
            wind_speed_kmh: 5, rain_forecast_minutes: 0, source: 'Mock'
        }),
        getPrediction: vi.fn().mockResolvedValue({
            recommended_action: 'MONITOR', ml_analysis: { confidence: 95 }
        }),
        getLogs: vi.fn().mockResolvedValue([]),
        getHistory: vi.fn().mockResolvedValue([]),
        getSystemState: vi.fn().mockResolvedValue({ mode: 'AUTO' }),
        simulationState: vi.fn().mockResolvedValue(null),
        toggleMode: vi.fn(),
        controlPump: vi.fn()
    }
}));

describe('Dashboard Page', () => {
    it('renders the dashboard title and key elements', async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        // Wait for async content (it starts with loading state)
        await waitFor(() => {
            expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
            expect(screen.getByText(/System Online/i)).toBeInTheDocument();
        });
    });
});
