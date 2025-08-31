
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { StoredFile } from '../types.ts';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons.tsx';
import Loader from './Loader.tsx';

interface PdfViewerModalProps {
    file: StoredFile;
    initialPage: number;
    highlightText?: string;
    onClose: () => void;
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ file, initialPage, highlightText, onClose }) => {
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [numPages, setNumPages] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const highlightLayerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const renderPage = useCallback(async (pageNum: number) => {
        if (!pdfDoc) return;
        setIsLoading(true);
        if (highlightLayerRef.current) {
            highlightLayerRef.current.innerHTML = '';
        }
        try {
            const page = await pdfDoc.getPage(pageNum);
            const canvas = canvasRef.current;
            const highlightLayer = highlightLayerRef.current;
            const container = containerRef.current;

            if (canvas && container && highlightLayer) {
                const desiredWidth = container.clientWidth;
                const viewport = page.getViewport({ scale: 1 });
                const scale = desiredWidth / viewport.width;
                const scaledViewport = page.getViewport({ scale });
                const pixelRatio = window.devicePixelRatio || 1;
                
                canvas.height = scaledViewport.height * pixelRatio;
                canvas.width = scaledViewport.width * pixelRatio;
                canvas.style.width = `${scaledViewport.width}px`;
                canvas.style.height = `${scaledViewport.height}px`;

                const context = canvas.getContext('2d');
                if (!context) {
                    setError("No se pudo obtener el contexto del canvas.");
                    setIsLoading(false);
                    return;
                }

                // High-DPI is handled by setting canvas dimensions vs style dimensions.
                await page.render({ canvasContext: context, viewport: scaledViewport, canvas: canvas }).promise;

                highlightLayer.style.width = canvas.style.width;
                highlightLayer.style.height = canvas.style.height;

                if (highlightText && highlightText.trim()) {
                    const textContent = await page.getTextContent();
                    const cleanedHighlight = highlightText.trim().toLowerCase();
                    
                    let pageText = '';
                    const textItemsWithPositions: ({ item: any, startPos: number, endPos: number } | null)[] = textContent.items.map(item => {
                        if ('str' in item) {
                            const startPos = pageText.length;
                            pageText += item.str;
                            return { item, startPos, endPos: pageText.length };
                        }
                        return null;
                    }).filter(Boolean);

                    const cleanedPageText = pageText.toLowerCase();
                    let startIndex = cleanedPageText.indexOf(cleanedHighlight);

                    if (startIndex !== -1) {
                        const endIndex = startIndex + cleanedHighlight.length;

                        const highlightItems = textItemsWithPositions.filter(itemWrapper => 
                           itemWrapper && itemWrapper.endPos > startIndex && itemWrapper.startPos < endIndex
                        );

                        highlightItems.forEach(itemWrapper => {
                            if (!itemWrapper) return;
                            const item = itemWrapper.item;
                            const transform = pdfjsLib.Util.transform(scaledViewport.transform, item.transform);
                            
                            const div = document.createElement('div');
                            div.style.position = 'absolute';
                            div.style.left = `${transform[4]}px`;
                            div.style.top = `${transform[5] - item.height * scale}px`; // Adjust top position based on height
                            div.style.width = `${item.width * scale}px`;
                            div.style.height = `${item.height * scale}px`;
                            div.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
                            div.style.pointerEvents = 'none';
                            highlightLayer.appendChild(div);
                        });
                    }
                }
                setCurrentPage(pageNum);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al renderizar la página del PDF.');
        } finally {
            setIsLoading(false);
        }
    }, [pdfDoc, highlightText]);

    useEffect(() => {
        const loadPdf = async () => {
            if (file.mimeType !== 'application/pdf') {
                setError(`El visor no es compatible con archivos de tipo "${file.mimeType}". Solo se pueden abrir archivos PDF.`);
                setIsLoading(false);
                return;
            }

            if (!file.base64Content) {
                setError("Contenido del archivo no disponible.");
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                const loadingTask = pdfjsLib.getDocument({data: atob(file.base64Content.split(',')[1])});
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
            } catch (e) {
                const message = e instanceof Error ? e.message : 'No se pudo cargar el archivo PDF.';
                setError(message.includes('Invalid PDF structure') ? 'Error: Estructura de PDF inválida.' : message);
                setIsLoading(false);
            }
        };
        loadPdf();
    }, [file.base64Content, file.mimeType]);
    
    useEffect(() => {
        if (pdfDoc) {
            renderPage(initialPage);
        }
    }, [pdfDoc, initialPage, renderPage]);

    const handlePrevPage = () => { if (currentPage > 1) renderPage(currentPage - 1); };
    const handleNextPage = () => { if (currentPage < numPages) renderPage(currentPage + 1); };

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="relative bg-[#FAF8F1] dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate pr-4" title={file.name}>
                        {file.name}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"><XMarkIcon className="h-6 w-6" /></button>
                </header>
                
                <main ref={containerRef} className="flex-grow overflow-auto p-4 flex items-center justify-center">
                    {isLoading && <Loader message="Cargando PDF..." />}
                    {error && <p className="text-red-500 text-center font-semibold p-4">{error}</p>}
                    <div className={`relative ${isLoading || error ? 'hidden' : ''}`}>
                        <canvas ref={canvasRef}></canvas>
                        <div ref={highlightLayerRef} className="absolute top-0 left-0"></div>
                    </div>
                </main>
                
                {numPages > 0 && !error && (
                    <footer className="flex-shrink-0 p-3 flex justify-center items-center gap-4 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={handlePrevPage} disabled={currentPage <= 1} className="p-2 rounded-full disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700">
                            <ChevronLeftIcon className="h-6 w-6" />
                        </button>
                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                            Página {currentPage} de {numPages}
                        </span>
                        <button onClick={handleNextPage} disabled={currentPage >= numPages} className="p-2 rounded-full disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700">
                            <ChevronRightIcon className="h-6 w-6" />
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default PdfViewerModal;
