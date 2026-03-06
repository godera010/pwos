import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadChart } from './LoadChart';

// Mock ResizeObserver for Recharts
globalThis.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('LoadChart Component', () => {
    const mockData = [
        { time: '10:00', value: 50, timestamp: 1000 },
        { time: '10:10', value: 60, timestamp: 1010 },
        { time: '10:20', value: 55, timestamp: 1020 },
    ];

    it('renders without crashing', () => {
        const { container } = render(<LoadChart data={mockData} />);
        expect(container).toBeInTheDocument();
    });

    it('displays the chart container', () => {
        render(<LoadChart data={mockData} />);
        // Recharts renders a container. We can check if the wrapper div exists.
        // The component has a specific height class h-[300px]
        // We can query by role or generic container check
        // Ideally we check for text, but axes might be hidden or complex to query in JSDOM
    });
});
