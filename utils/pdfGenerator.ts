import jsPDF from 'jspdf';
import { SavedQuiz } from '../types';

export const generatePdfBlob = async (quizzes: SavedQuiz[]): Promise<Blob> => {
    const doc = new jsPDF();
    let y = 15; // Vertical position
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const lineHeight = 7;
    const maxLineWidth = doc.internal.pageSize.width - margin * 2;
    let questionCounter = 1;
    const answers: string[] = [];

    const checkPageBreak = (heightNeeded: number) => {
        if (y + heightNeeded > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
    };

    for (const quiz of quizzes) {
        checkPageBreak(10);
        doc.setFont('helvetica', 'bold');
        doc.text(quiz.title, margin, y);
        y += lineHeight * 1.5;
        doc.setFont('helvetica', 'normal');

        for (const question of quiz.questions) {
            const questionText = `${questionCounter}. ${question.question}`;
            const questionLines = doc.splitTextToSize(questionText, maxLineWidth);
            
            checkPageBreak(questionLines.length * lineHeight + 4 * lineHeight + 5);
            doc.setFont('helvetica', 'bold');
            doc.text(questionLines, margin, y);
            y += questionLines.length * lineHeight;
            doc.setFont('helvetica', 'normal');

            const correctAnswerLetter = String.fromCharCode(97 + question.options.findIndex(opt => opt === question.correctAnswer));
            answers.push(`${questionCounter}-${correctAnswerLetter}`);

            question.options.forEach((option, index) => {
                const optionLetter = String.fromCharCode(97 + index);
                const optionText = `${optionLetter}) ${option}`;
                const optionLines = doc.splitTextToSize(optionText, maxLineWidth - 5);
                
                checkPageBreak(optionLines.length * lineHeight);
                doc.text(optionLines, margin + 5, y);
                y += optionLines.length * lineHeight;
            });
            y += lineHeight; // Space between questions
            questionCounter++;
        }
    }

    // Add Answer Sheet
    doc.addPage();
    y = margin;
    doc.setFont('helvetica', 'bold');
    doc.text('Hoja de Respuestas', doc.internal.pageSize.width / 2, y, { align: 'center' });
    y += lineHeight * 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const midPoint = Math.ceil(answers.length / 2);
    const firstCol = answers.slice(0, midPoint);
    const secondCol = answers.slice(midPoint);

    const col1X = margin;
    const col2X = doc.internal.pageSize.width / 2 + 10;
    
    for (let i = 0; i < midPoint; i++) {
        checkPageBreak(5);
        if (firstCol[i]) {
            doc.text(firstCol[i], col1X, y);
        }
        if (secondCol[i]) {
            doc.text(secondCol[i], col2X, y);
        }
        y += 5; // Space between answer lines
    }

    return doc.output('blob');
};