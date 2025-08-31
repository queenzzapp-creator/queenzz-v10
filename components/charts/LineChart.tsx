import React, { useMemo } from 'react';

interface LineChartProps {
  data: { x: string; y: number }[];
  yAxisLabel?: string;
  theme?: 'light' | 'dark';
  maxY?: number;
}

const LineChart: React.FC<LineChartProps> = ({ data, yAxisLabel, theme = 'light', maxY = 10 }) => {
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const colors = {
        light: { text: '#475569', grid: '#e2e8f0' },
        dark: { text: '#cbd5e1', grid: '#334155' }
    };
    const currentColors = colors[theme];

    const xScale = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;
    const yScale = chartHeight / maxY;
    
    const yAxisTicks = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => {
            const value = (maxY / 4) * i;
            return { value, y: chartHeight - (value * yScale) };
        });
    }, [maxY, yScale, chartHeight]);

    const pathData = useMemo(() => {
        if (data.length < 2) return '';
        const path = data.map((d, i) => {
            const x = i * xScale;
            const y = chartHeight - (d.y * yScale);
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ');
        return path;
    }, [data, xScale, yScale, chartHeight]);

    if (data.length === 0) return null;

    return (
         <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" aria-label={`Gráfico de líneas: ${yAxisLabel}`}>
            <g transform={`translate(${margin.left}, ${margin.top})`}>
                 {/* Grid lines and Y-axis */}
                {yAxisTicks.map(tick => (
                    <g key={tick.value} className="tick">
                        <line
                            x1={0}
                            x2={chartWidth}
                            y1={tick.y}
                            y2={tick.y}
                            stroke={currentColors.grid}
                            strokeDasharray="2,3"
                        />
                        <text
                            x={-8}
                            y={tick.y}
                            textAnchor="end"
                            dy="0.32em"
                            fontSize="10"
                            fill={currentColors.text}
                        >
                            {tick.value}
                        </text>
                    </g>
                ))}

                {/* Line path */}
                {pathData && (
                    <path
                        d={pathData}
                        fill="none"
                        strokeWidth="2"
                        className="animate-draw stroke-purple-500 dark:stroke-purple-400"
                        style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
                    />
                )}
                
                {/* Data points */}
                {data.map((d, i) => {
                    const x = i * xScale;
                    const y = chartHeight - (d.y * yScale);
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="4"
                            className="opacity-0 fill-purple-700 dark:fill-purple-500"
                            style={{ animation: `fadeIn 0.5s ease forwards ${i * 0.05}s` }}
                        >
                            <title>{`${d.x}: ${d.y}`}</title>
                        </circle>
                    );
                })}

                {/* X-axis labels */}
                {data.map((d, i) => {
                     if (data.length > 10 && i % (Math.floor(data.length / 10)) !== 0 && i !== data.length-1) {
                         return null;
                     }
                    return (
                        <text
                            key={i}
                            x={i * xScale}
                            y={chartHeight + 20}
                            textAnchor="middle"
                            fontSize="10"
                            fill={currentColors.text}
                        >
                            {d.x}
                        </text>
                    );
                })}

                {yAxisLabel && (
                    <text
                        transform="rotate(-90)"
                        y={0 - margin.left}
                        x={0 - (chartHeight / 2)}
                        dy="1em"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill={currentColors.text}
                    >
                        {yAxisLabel}
                    </text>
                 )}
            </g>
             <style>{`
                .animate-draw { animation: draw-line 1s ease-out forwards; }
                @keyframes draw-line { to { stroke-dashoffset: 0; } }
                @keyframes fadeIn { to { opacity: 1; } }
            `}</style>
        </svg>
    );
};

export default LineChart;