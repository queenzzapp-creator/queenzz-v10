import React, { useMemo } from 'react';

interface BarChartProps {
  data: { label: string; value: number }[];
  yAxisLabel?: string;
  theme?: 'light' | 'dark';
  orientation?: 'vertical' | 'horizontal';
}

const BarChart: React.FC<BarChartProps> = ({ data, yAxisLabel, theme = 'light', orientation = 'vertical' }) => {
    if (data.length === 0) return null;

    if (orientation === 'horizontal') {
        return <HorizontalBarChart data={data} theme={theme} />;
    }
    return <VerticalBarChart data={data} yAxisLabel={yAxisLabel} theme={theme} />;
};

const VerticalBarChart: React.FC<Omit<BarChartProps, 'orientation'>> = ({ data, yAxisLabel, theme }) => {
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 80, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const colors = {
        light: { text: '#475569', grid: '#e2e8f0' },
        dark: { text: '#cbd5e1', grid: '#334155' }
    };
    const currentColors = colors[theme!];

    const maxValue = useMemo(() => {
        const maxVal = Math.max(...data.map(d => d.value), 0);
        return maxVal > 0 ? Math.ceil(maxVal / 4) * 4 : 4; // Find next multiple of 4
    }, [data]);

    const yScale = chartHeight / maxValue;
    const barWidth = data.length > 0 ? chartWidth / data.length : 0;
    const barPadding = 5;

    const yAxisTicks = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => {
            const value = (maxValue / 4) * i;
            return { value, y: chartHeight - (value * yScale) };
        });
    }, [yScale, chartHeight, maxValue]);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" aria-label={`Gráfico de barras: ${yAxisLabel}`}>
            <g transform={`translate(${margin.left}, ${margin.top})`}>
                {yAxisTicks.map(tick => (
                    <g key={tick.value} className="tick">
                        <line x1={0} x2={chartWidth} y1={tick.y} y2={tick.y} stroke={currentColors.grid} strokeDasharray="2,3" />
                        <text x={-8} y={tick.y} textAnchor="end" dy="0.32em" fontSize="10" fill={currentColors.text}>{tick.value}</text>
                    </g>
                ))}
                {data.map((d, i) => {
                    const barHeight = d.value * yScale;
                    const x = i * barWidth;
                    const y = chartHeight - barHeight;
                    return (
                        <g key={d.label}>
                            <rect x={x + barPadding / 2} y={y} width={barWidth - barPadding} height={barHeight} className="fill-indigo-500 dark:fill-indigo-400" rx="2">
                                <animate attributeName="height" from="0" to={barHeight} dur="0.5s" fill="freeze" />
                                <animate attributeName="y" from={chartHeight} to={y} dur="0.5s" fill="freeze" />
                            </rect>
                            <text x={x + barWidth / 2} y={chartHeight + 15} textAnchor="middle" dy="0.71em" fontSize="10" fill={currentColors.text} transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight + 15})`}>
                                {d.label.length > 20 ? `${d.label.substring(0, 18)}...` : d.label}
                            </text>
                        </g>
                    );
                })}
                 {yAxisLabel && (
                    <text transform="rotate(-90)" y={0 - margin.left} x={0 - (chartHeight / 2)} dy="1em" textAnchor="middle" fontSize="10" fontWeight="bold" fill={currentColors.text}>
                        {yAxisLabel}
                    </text>
                 )}
            </g>
        </svg>
    );
}

const HorizontalBarChart: React.FC<Omit<BarChartProps, 'orientation' | 'yAxisLabel'>> = ({ data, theme }) => {
    const itemHeight = 40;
    const margin = { top: 20, right: 40, bottom: 20, left: 150 };
    const height = data.length * itemHeight + margin.top + margin.bottom;
    const width = 600;
    const chartWidth = width - margin.left - margin.right;
    
    const colors = {
        light: { text: '#475569' },
        dark: { text: '#cbd5e1' }
    };
    const currentColors = colors[theme!];

    const getBarClass = (value: number) => {
        if (value >= 70) return 'fill-green-500';
        if (value >= 40) return 'fill-yellow-500 dark:fill-yellow-400';
        return 'fill-red-500';
    };
    
    const getTextColorClass = (value: number) => {
        if (value >= 70) return 'fill-green-600 dark:fill-green-400';
        if (value >= 40) return 'fill-yellow-600 dark:fill-yellow-400';
        return 'fill-red-600 dark:fill-red-400';
    };

    const xScale = chartWidth / 100; // Max value is 100%

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" aria-label="Gráfico de barras de dominio por tema">
            <g transform={`translate(${margin.left}, ${margin.top})`}>
                {data.map((d, i) => (
                    <g key={i}>
                        <text x={-10} y={i * itemHeight + itemHeight / 2} textAnchor="end" dy="0.32em" fontSize="12" fill={currentColors.text} className="truncate">
                            {d.label.length > 25 ? `${d.label.substring(0, 23)}...` : d.label}
                        </text>
                        <rect x={0} y={i * itemHeight + 5} width={chartWidth} height={itemHeight - 10} fill={theme === 'light' ? '#f1f5f9' : '#1e293b'} rx="3" />
                        <rect x={0} y={i * itemHeight + 5} width={d.value * xScale} height={itemHeight - 10} className={getBarClass(d.value)} rx="3">
                            <animate attributeName="width" from="0" to={d.value * xScale} dur="0.5s" fill="freeze" />
                        </rect>
                        <text x={d.value * xScale + 5} y={i * itemHeight + itemHeight / 2} dy="0.32em" fontSize="12" fontWeight="bold" className={getTextColorClass(d.value)}>
                            {`${d.value}%`}
                        </text>
                    </g>
                ))}
            </g>
        </svg>
    );
}

export const StackedBarChart: React.FC<{
  correct: number;
  failed: number;
  unanswered: number;
  total: number;
}> = ({ correct, failed, unanswered, total }) => {
    if (total === 0) {
        return <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full" title="Sin responder" />;
    }

    const correctPercent = (correct / total) * 100;
    const failedPercent = (failed / total) * 100;
    const unansweredPercent = (unanswered / total) * 100;

    return (
        <div className="w-full flex h-4 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700" title={`Acertadas: ${correct}, Falladas: ${failed}, En Blanco: ${unanswered}`}>
            <div className="bg-green-500 h-full" style={{ width: `${correctPercent}%` }} />
            <div className="bg-red-500 h-full" style={{ width: `${failedPercent}%` }} />
            <div className="bg-sky-500 h-full" style={{ width: `${unansweredPercent}%` }} />
        </div>
    );
};


export default BarChart;