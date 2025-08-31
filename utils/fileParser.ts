

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

const CHARS_PER_PAGE = 1800; // A reasonable estimate for page approximation

/**
 * Parses a page range string (e.g., "1-5, 8, 10-12") into an array of numbers.
 * @param rangeStr The string to parse.
 * @param maxPage The maximum allowed page number.
 * @returns An array of page numbers.
 */
const parsePageRange = (rangeStr: string, maxPage: number): number[] => {
  const pages = new Set<number>();
  if (!rangeStr) return [];
  const parts = rangeStr.replace(/\s/g, '').split(',');

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          if (i > 0 && i <= maxPage) {
            pages.add(i);
          }
        }
      }
    } else {
      const page = Number(part);
      if (!isNaN(page) && page > 0 && page <= maxPage) {
        pages.add(page);
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
};

/**
 * Gets the number of pages in a PDF file.
 * @param file The PDF file.
 * @returns A promise that resolves with the number of pages.
 */
export const getPdfPageCount = async (file: File): Promise<number> => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
        throw new Error("El archivo no es un PDF.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    return pdf.numPages;
};

// Internal helper to get full text from non-PDF files
const getFullTextFromNonPdf = async (file: File): Promise<string> => {
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        let html = result.value;
        html = html.replace(/<\/(p|h[1-6]|li|tr|div)>/gi, '\n');
        html = html.replace(/<(?!\/?(strong|em|u|b|i|mark)\b)[^>]+>/gi, '');
        return html;
    }
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        return file.text();
    }
    return '';
}

/**
 * Gets the page count for a file. Returns exact count for PDFs and an approximation for others.
 * @param file The file to check.
 * @returns A promise resolving to an object with the count and whether it's an approximation.
 */
export const getFilePageCount = async (file: File): Promise<{count: number, isApproximation: boolean}> => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
        const count = await getPdfPageCount(file);
        return { count, isApproximation: false };
    }

    const text = await getFullTextFromNonPdf(file);
    if (!text) return { count: 0, isApproximation: true };
    return { count: Math.ceil(text.length / CHARS_PER_PAGE), isApproximation: true };
};


/**
 * Parses the content of a file and returns it as a string.
 * Supports PDF (with page range selection), DOCX, and plain text files.
 * @param file The file to parse.
 * @param pageRange Optional string to specify page ranges for PDFs (e.g., "1-5, 8").
 * @returns A promise that resolves with the extracted text content.
 */
export const parseFileToText = async (file: File, pageRange?: string): Promise<string> => {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let pagesToParse: number[] = [];

    if (pageRange) {
      pagesToParse = parsePageRange(pageRange, pdf.numPages);
    } else {
      pagesToParse = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
    }

    if (pagesToParse.length === 0) return '';

    let textContent = '';
    for (const pageNum of pagesToParse) {
      const page = await pdf.getPage(pageNum);
      const text = await page.getTextContent();
      textContent += text.items.map(item => 'str' in item ? item.str : '').join('\n');
      textContent += '\n\n';
    }
    return textContent;
  } 
  
  const fullText = await getFullTextFromNonPdf(file);
  if (!fullText) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx') || file.type === 'text/plain' || file.name.endsWith('.txt')) {
          return ''; // It's a supported type but empty
      }
      throw new Error(`Tipo de archivo no soportado: ${file.name}. Por favor, usa PDF, DOCX, o TXT.`);
  }

  if (pageRange) {
      const totalApproxPages = Math.ceil(fullText.length / CHARS_PER_PAGE);
      const selectedPages = parsePageRange(pageRange, totalApproxPages);
      
      if (selectedPages.length === 0) return '';
      
      return selectedPages.map(pageNum => {
          const start = (pageNum - 1) * CHARS_PER_PAGE;
          const end = start + CHARS_PER_PAGE;
          return fullText.substring(start, end);
      }).join('\n\n');
  }
  
  return fullText;
};

/**
 * Converts a File object to a Base64 encoded string.
 * @param file The file to convert.
 * @returns A promise that resolves with the Base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Parses text from a base64 encoded string based on its MIME type.
 * @param base64Content The base64 data URL.
 * @param mimeType The MIME type of the content.
 * @returns A promise that resolves with the extracted text content.
 */
export const parseTextFromContent = async (base64Content: string, mimeType: string): Promise<string> => {
    const arrayBuffer = Uint8Array.from(atob(base64Content.split(',')[1]), c => c.charCodeAt(0)).buffer;

    if (mimeType === 'application/pdf') {
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const pagesToParse = Array.from({ length: pdf.numPages }, (_, i) => i + 1);

        if (pagesToParse.length === 0) return '';
        let textContent = '';
        for (const pageNum of pagesToParse) {
            const page = await pdf.getPage(pageNum);
            const text = await page.getTextContent();
            textContent += text.items.map(item => 'str' in item ? item.str : '').join('\n');
            textContent += '\n\n';
        }
        return textContent;
    }
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        let html = result.value;
        html = html.replace(/<\/(p|h[1-6]|li|tr|div)>/gi, '\n');
        html = html.replace(/<(?!\/?(strong|em|u|b|i|mark)\b)[^>]+>/gi, '');
        return html;
    } else if (mimeType === 'text/plain') {
        return new TextDecoder().decode(arrayBuffer);
    } else {
        throw new Error(`Tipo de archivo no soportado: ${mimeType}.`);
    }
};