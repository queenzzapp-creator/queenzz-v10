import React from 'react';

// A simple renderer for basic markdown-like formatting from the AI.
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    // Split text into paragraphs based on one or more newlines
    const paragraphs = text.split(/\n+/);
  
    return (
        <div className="text-sm">
            {paragraphs.map((paragraph, pIndex) => {
                // Split each paragraph by bold/italic markers, keeping the markers for identification
                const parts = paragraph.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(Boolean);
                return (
                    <p key={pIndex} className="mb-2 last:mb-0">
                        {parts.map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={j}>{part.slice(2, -2)}</strong>;
                            }
                            if (part.startsWith('*') && part.endsWith('*')) {
                                return <em key={j}>{part.slice(1, -1)}</em>;
                            }
                            return part;
                        })}
                    </p>
                );
            })}
        </div>
    );
};

export default MarkdownRenderer;
