import { useState, useEffect, RefObject } from 'react';

export const useResizeObserver = (ref: RefObject<HTMLElement>) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                setDimensions({ width, height });
            }
        });

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [ref]);

    return dimensions;
};
