import React from 'react';

interface CircularProgressBarProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  theme?: 'light' | 'dark';
}

const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  percentage,
  size = 192,
  strokeWidth = 20,
  theme = 'light',
}) => {
    const radius = (size / 2) - strokeWidth / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const colors = {
        light: { track: '#e2e8f0', text: '#1e293b' },
        dark: { track: '#334155', text: '#e2e8f0' }
    };
    const currentColors = colors[theme];

    const mainFontSize = size < 100 ? 'text-xl' : 'text-4xl';
    
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg
                height={size}
                width={size}
                viewBox={`0 0 ${size} ${size}`}
                className="-rotate-90"
            >
                <circle
                    stroke={currentColors.track}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className={`transition-all duration-500 ease-out ${percentage > 0 ? 'stroke-purple-500 dark:stroke-purple-400' : 'stroke-transparent'}`}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    style={{ strokeDashoffset }}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className={`${mainFontSize} font-bold`} style={{ color: currentColors.text }}>
                    {`${Math.round(percentage)}%`}
                </span>
            </div>
        </div>
    );
};

export default CircularProgressBar;