import { GoogleGenAI, Type, GenerateContentResponse, Chat, Part } from "@google/genai";
import { AppData, GeneratedQuiz, QuizQuestion, Quiz, GeneratedFlashcardDeck, GeneratedFlashcard, QuizDifficulty, LibraryItem, Settings, StoredFile, DocumentItem } from '../types.ts';
import { tools } from './tools.ts';

let genAIClient: GoogleGenAI | null = null;
const API_CALL_DELAY_MS = 200; // 200ms delay between calls (5 calls/sec)
const MAX_RETRIES = 3;

const getClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("La variable de entorno API_KEY no está configurada");
    }
    if (!genAIClient) {
        genAIClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return genAIClient;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handleGeminiError = (error: any, jsonText: string = ''): Error => {
    console.error("Error calling Gemini API:", error);

    if (error instanceof SyntaxError) {
        console.error("Malformed JSON response from API:", jsonText);
        return new Error("La API devolvió un texto con formato incorrecto. Esto puede ocurrir si el texto de entrada contiene caracteres complejos. Inténtalo de nuevo.");
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
        return new Error("Clave de API no válida. Por favor, asegúrate de que tu clave de API de Gemini está configurada correctamente.");
    }
    if (errorMessage.includes('RESOURCE_EXHAUSTED')) {
        return new Error("Límite de cuota de la API alcanzado. Por favor, espera un momento y vuelve a intentarlo.");
    }
    if (errorMessage.includes('SAFETY')) {
        return new Error("La solicitud fue bloqueada por filtros de seguridad. Intenta modificar el texto de entrada.");
    }
    if (errorMessage.includes('xhr error') || errorMessage.includes('500') || errorMessage.includes('failed')) {
         return new Error(`Error de comunicación con la API. Puede ser un problema temporal de red. Por favor, espera y reintenta.`);
    }
    
    if (error instanceof Error) {
        try {
            const jsonStartIndex = errorMessage.indexOf('{');
            if (jsonStartIndex > -1) {
                const errorJson = JSON.parse(errorMessage.substring(jsonStartIndex));
                const message = errorJson?.error?.message || errorMessage;
                return new Error(`Error de la API de Gemini: ${message}`);
            }
        } catch(e) {
            // Not a JSON string, fall through
        }
        return new Error(`Error de la API de Gemini: ${errorMessage}`);
    }

    return new Error("Ocurrió un error desconocido al comunicarse con la API.");
};

/**
 * A robust wrapper for making calls to the Gemini API.
 * Implements retry logic with exponential backoff and a fixed delay between calls.
 */
const callGeminiWithRetries = async (request: any): Promise<GenerateContentResponse> => {
    const localAi = getClient();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await localAi.models.generateContent(request);
            
            // Wait for a fixed delay after a successful call to prevent rate limiting
            await delay(API_CALL_DELAY_MS);

            if (!response || !response.text) {
                const blockReason = response?.candidates?.[0]?.finishReason;
                if (blockReason === 'SAFETY') {
                    throw new Error("La solicitud fue bloqueada por filtros de seguridad. Intenta modificar el texto de entrada.");
                }
                 throw new Error(`La API devolvió una respuesta vacía o incompleta. Razón: ${blockReason || 'desconocida'}.`);
            }
            return response;
        } catch (error: any) {
            lastError = handleGeminiError(error);
            console.warn(`Intento ${attempt + 1} fallido. Reintentando en ${2 ** attempt}s...`);
            await delay((2 ** attempt) * 1000); // Exponential backoff: 1s, 2s, 4s
        }
    }
    throw lastError || new Error("Todos los intentos de llamada a la API fallaron.");
};


const quizSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "Un título conciso y relevante para el test basado en el texto proporcionado, máximo 5-7 palabras."
        },
        questions: {
            type: Type.ARRAY,
            description: "El array de preguntas del test.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: {
                        type: Type.STRING,
                        description: "La pregunta de opción múltiple."
                    },
                    options: {
                        type: Type.ARRAY,
                        description: "Un array de al menos 2 posibles respuestas como cadenas de texto.",
                        items: { type: Type.STRING }
                    },
                    correctAnswerIndex: {
                        type: Type.INTEGER,
                        description: "El índice numérico (de 0 a N-1, donde N es el número de opciones) de la respuesta correcta que corresponde al array de 'opciones'."
                    },
                    explanation: {
                        type: Type.STRING,
                        description: "Una breve explicación de por qué la respuesta es correcta, para mostrar después de que el usuario responda."
                    }
                },
                required: ["question", "options", "correctAnswerIndex", "explanation"]
            }
        }
    },
    required: ["title", "questions"]
};

const flashcardSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "Un título conciso y relevante para el mazo de fichas de estudio, basado en el texto."
        },
        cards: {
            type: Type.ARRAY,
            description: "Un array de fichas de estudio (flashcards).",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: {
                        type: Type.STRING,
                        description: "La pregunta, término o concepto clave que va en el anverso de la ficha."
                    },
                    answer: {
                        type: Type.STRING,
                        description: "La respuesta, definición o explicación que va en el reverso de la ficha."
                    }
                },
                required: ["question", "answer"]
            }
        }
    },
    required: ["title", "cards"]
};


const validateQuizData = (quizData: any, sourceInfo?: { quizId: string; quizTitle: string }): GeneratedQuiz => {
    if (typeof quizData.title !== 'string' || !Array.isArray(quizData.questions)) {
        throw new Error("La API no devolvió un título y un array de preguntas válidos.");
    }

    const validatedQuestions: Quiz = quizData.questions.map((item: any) => {
        if (
            typeof item.question === 'string' &&
            Array.isArray(item.options) &&
            item.options.length >= 2 &&
            item.options.every((opt: any) => typeof opt === 'string') &&
            typeof item.correctAnswerIndex === 'number' &&
            item.correctAnswerIndex >= 0 && item.correctAnswerIndex < item.options.length &&
            typeof item.explanation === 'string'
        ) {
            const correctAnswer = item.options[item.correctAnswerIndex];
            const baseQuestion: Partial<QuizQuestion> = { 
                ...item,
                question: item.question.replace(/\s*\[\d+\]\s*/g, ' ').trim(),
                explanation: item.explanation.replace(/\s*\[\d+\]\s*/g, ' ').trim(),
                id: crypto.randomUUID(), 
                correctAnswer,
                sourcePage: item.pageNumberInDocument 
            };
            if (sourceInfo) {
                return { ...baseQuestion, sourceQuizId: sourceInfo.quizId, sourceQuizTitle: sourceInfo.quizTitle } as QuizQuestion;
            }
            return baseQuestion as QuizQuestion;
        }
        console.warn("Se encontró una pregunta malformada y se omitió:", item);
        return null; // Return null for invalid items
    }).filter((q): q is QuizQuestion => q !== null); // Filter out nulls
    
    if(validatedQuestions.length === 0 && quizData.questions.length > 0) {
        throw new Error("Ninguna de las preguntas recibidas de la API tenía el formato correcto.");
    }
    
    if(validatedQuestions.length === 0) {
        throw new Error("El test procesado no tiene preguntas válidas.");
    }

    return { title: quizData.title, questions: validatedQuestions };
};

const validateFlashcardDeckData = (deckData: any): GeneratedFlashcardDeck => {
    if (typeof deckData.title !== 'string' || !Array.isArray(deckData.cards)) {
        throw new Error("La API no devolvió un título y un array de fichas válidos.");
    }

    const validatedCards: GeneratedFlashcard[] = deckData.cards.map((item: any) => {
        if (typeof item.question === 'string' && typeof item.answer === 'string') {
            return { question: item.question, answer: item.answer };
        }
        console.warn("Se encontró una ficha malformada y se omitió:", item);
        return null;
    }).filter((c): c is GeneratedFlashcard => c !== null);

    if (validatedCards.length === 0 && deckData.cards.length > 0) {
        throw new Error("Ninguna de las fichas recibidas de la API tenía el formato correcto.");
    }
     if (validatedCards.length === 0) {
        throw new Error("El mazo de fichas procesado no tiene contenido válido.");
    }

    return { title: deckData.title, cards: validatedCards };
};


export const generateQuizFromText = async (text: string, questionCount: number, difficulty: QuizDifficulty, instructions?: string, numberOfOptions: 2 | 3 | 4 | 5 | 'variable' = 4): Promise<GeneratedQuiz> => {
    let jsonText = ''; // Keep it in scope for the catch block
    try {
        const questionPromptInstruction = questionCount > 0
            ? `El test debe tener un título corto y relevante y exactamente ${questionCount} preguntas de opción múltiple.`
            : `El test debe tener un título corto y relevante y un número variable de preguntas de opción múltiple. El número de preguntas debe ser determinado por la longitud y complejidad del texto, buscando crear un test completo.`;
        
        const optionsInstruction = typeof numberOfOptions === 'number'
            ? `Cada pregunta debe tener exactamente ${numberOfOptions} opciones.`
            : `El número de opciones por pregunta debe ser variable, entre 2 y 5, según lo que sea más apropiado para la pregunta.`;

        const instructionBlock = instructions ? `INSTRUCCIÓN DE ALTA PRIORIDAD DEL USUARIO: ${instructions}\n\n---\n` : '';

        const prompt = `${instructionBlock}Tu tarea es crear un test de alta calidad sobre el siguiente texto, con un nivel de dificultad '${difficulty}'. Sigue estas prioridades:
1.  **Prioridad Máxima: Preguntas de Exámenes Oficiales.** Si el texto lo permite, intenta formular preguntas que se asemejen a las de exámenes oficiales sobre el tema.
2.  **Prioridad Secundaria: Conceptos Clave.** Si no es posible crear preguntas tipo examen, enfócate en los conceptos más importantes y fundamentales del texto.
3.  **Variedad:** Asegúrate de crear una variedad de preguntas (definiciones, comparaciones, aplicación de conceptos) para evaluar el conocimiento desde diferentes ángulos.

${questionPromptInstruction} ${optionsInstruction} Para cada pregunta, proporciona sus opciones, el ÍNDICE NUMÉRICO (de 0 a N-1) de la respuesta correcta y una breve explicación.

REGLA CRÍTICA: Al generar el JSON, si cualquier texto que extraes del documento contiene comillas dobles ("), DEBES escaparlas con una barra invertida (ejemplo: \\").

Texto:
---
${text}
---
`;

        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema,
                temperature: 0.5,
            },
        };

        const response: GenerateContentResponse = await callGeminiWithRetries(request);
        
        jsonText = response.text.trim();
        const quizData = JSON.parse(jsonText);
        return validateQuizData(quizData);

    } catch (error) {
        throw handleGeminiError(error, jsonText);
    }
};

export const generateQuizFromContent = async (text: string, pageImages: string[], questionCount: number, difficulty: QuizDifficulty, instructions?: string, numberOfOptions: 2 | 3 | 4 | 5 | 'variable' = 4): Promise<GeneratedQuiz> => {
    let jsonText = ''; // Keep it in scope for the catch block
    try {
        const questionPromptInstruction = questionCount > 0
            ? `El test debe tener un título corto y relevante y exactamente ${questionCount} preguntas de opción múltiple.`
            : `El test debe tener un título corto y relevante y un número variable de preguntas de opción múltiple. El número de preguntas debe ser determinado por la longitud y complejidad del texto, buscando crear un test completo.`;
        
        const optionsInstruction = typeof numberOfOptions === 'number'
            ? `Cada pregunta debe tener exactamente ${numberOfOptions} opciones.`
            : `El número de opciones por pregunta debe ser variable, entre 2 y 5, según lo que sea más apropiado para la pregunta.`;

        const instructionBlock = instructions ? `INSTRUCCIÓN DE ALTA PRIORIDAD DEL USUARIO: ${instructions}\n\n---\n` : '';

        const prompt = `${instructionBlock}Tu tarea es crear un test de alta calidad sobre el siguiente texto y las imágenes de las páginas proporcionadas, con un nivel de dificultad '${difficulty}'. Sigue estas prioridades:
1.  **Prioridad Máxima: Preguntas de Exámenes Oficiales.** Si el texto lo permite, intenta formular preguntas que se asemejen a las de exámenes oficiales sobre el tema.
2.  **Prioridad Secundaria: Conceptos Clave.** Si no es posible crear preguntas tipo examen, enfócate en los conceptos más importantes y fundamentales del texto.
3.  **Variedad:** Asegúrate de crear una variedad de preguntas (definiciones, comparaciones, aplicación de conceptos) para evaluar el conocimiento desde diferentes ángulos.

${questionPromptInstruction} ${optionsInstruction} Para cada pregunta, proporciona sus opciones, el ÍNDICE NUMÉRICO (de 0 a N-1) de la respuesta correcta y una breve explicación.

REGLA CRÍTICA: Al generar el JSON, si cualquier texto que extraes del documento contiene comillas dobles ("), DEBES escaparlas con una barra invertida (ejemplo: \\").

Texto:
---
${text}
---
`;

        const parts: Part[] = [{ text: prompt }];
        pageImages.forEach(imgBase64 => {
            const [, data] = imgBase64.split(',');
            parts.push({ inlineData: { mimeType: 'image/jpeg', data } });
        });

        const request = {
            model: "gemini-2.5-flash",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema,
                temperature: 0.5,
            },
        };

        const response: GenerateContentResponse = await callGeminiWithRetries(request);
        
        jsonText = response.text.trim();
        const quizData = JSON.parse(jsonText);
        return validateQuizData(quizData);

    } catch (error) {
        throw handleGeminiError(error, jsonText);
    }
};

export const generateFlashcardsFromText = async (text: string, cardCount: number, difficulty: QuizDifficulty, instructions?: string): Promise<GeneratedFlashcardDeck> => {
    let jsonText = '';
    try {
        const cardPromptInstruction = cardCount > 0
            ? `El mazo debe tener exactamente ${cardCount} fichas de estudio.`
            : `El número de fichas debe ser apropiado para la longitud y densidad del texto, buscando crear un mazo completo.`;
        
        const instructionBlock = instructions ? `INSTRUCCIÓN DE ALTA PRIORIDAD DEL USUARIO: ${instructions}\n\n---\n` : '';

        const prompt = `${instructionBlock}Basado en el siguiente texto, crea un mazo de fichas de estudio (flashcards) de nivel de dificultad '${difficulty}'. ${cardPromptInstruction} Cada ficha debe tener una pregunta (término, concepto) y una respuesta (definición, explicación).

        REGLA CRÍTICA: Al generar el JSON, si cualquier texto que extraes del documento contiene comillas dobles ("), DEBES escaparlas con una barra invertida (ejemplo: \\").

        Texto:
        ---
        ${text}
        ---
        `;
        
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: flashcardSchema,
                temperature: 0.5,
            },
        };

        const response: GenerateContentResponse = await callGeminiWithRetries(request);
        
        jsonText = response.text.trim();
        const deckData = JSON.parse(jsonText);
        return validateFlashcardDeckData(deckData);

    } catch (error) {
        throw handleGeminiError(error, jsonText);
    }
};

export const generateFlashcardsFromContent = async (text: string, pageImages: string[], cardCount: number, difficulty: QuizDifficulty, instructions?: string): Promise<GeneratedFlashcardDeck> => {
    let jsonText = '';
    try {
        const cardPromptInstruction = cardCount > 0
            ? `El mazo debe tener exactamente ${cardCount} fichas de estudio.`
            : `El número de fichas debe ser apropiado para la longitud y densidad del texto, buscando crear un mazo completo.`;
        
        const instructionBlock = instructions ? `INSTRUCCIÓN DE ALTA PRIORIDAD DEL USUARIO: ${instructions}\n\n---\n` : '';

        const prompt = `${instructionBlock}Basado en el siguiente texto y las imágenes de las páginas, crea un mazo de fichas de estudio (flashcards) de nivel de dificultad '${difficulty}'. ${cardPromptInstruction} Cada ficha debe tener una pregunta (término, concepto) y una respuesta (definición, explicación).

        REGLA CRÍTICA: Al generar el JSON, si cualquier texto que extraes del documento contiene comillas dobles ("), DEBES escaparlas con una barra invertida (ejemplo: \\").

        Texto:
        ---
        ${text}
        ---
        `;
        
        const parts: Part[] = [{ text: prompt }];
        pageImages.forEach(imgBase64 => {
            const [, data] = imgBase64.split(',');
            parts.push({ inlineData: { mimeType: 'image/jpeg', data } });
        });

        const request = {
            model: "gemini-2.5-flash",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: flashcardSchema,
                temperature: 0.5,
            },
        };

        const response: GenerateContentResponse = await callGeminiWithRetries(request);
        
        jsonText = response.text.trim();
        const deckData = JSON.parse(jsonText);
        return validateFlashcardDeckData(deckData);

    } catch (error) {
        throw handleGeminiError(error, jsonText);
    }
};


export const generateQuizFromWeb = async (topic: string, questionCount: number, difficulty: QuizDifficulty, url?: string, instructions?: string, numberOfOptions: 2 | 3 | 4 | 5 | 'variable' = 4): Promise<GeneratedQuiz> => {
    try {
        let groundingPrompt: string;
        if (url) {
            groundingPrompt = `Usando la búsqueda de Google, prioriza el contenido de la siguiente URL para recopilar información detallada: ${url}. Si el acceso a la URL falla, utiliza el tema "${topic}" como respaldo para una búsqueda general. La información debe ser factual y suficiente para crear un test de opción múltiple de alta calidad. Resume los hallazgos en un texto coherente.`;
        } else {
            groundingPrompt = `Usando la búsqueda de Google, recopila información completa y detallada sobre el siguiente tema: "${topic}". La información debe ser factual y suficiente para crear un test de opción múltiple de alta calidad. Resume los hallazgos en un texto coherente.`;
        }
        
        const request = {
            model: "gemini-2.5-flash",
            contents: groundingPrompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.2, // Lower temperature for more factual retrieval
            },
        };

        const groundingResponse: GenerateContentResponse = await callGeminiWithRetries(request);
        const groundedText = groundingResponse.text;
        
        if (!groundedText || groundedText.trim().length < 50) { // Basic check for content
            throw new Error("No se encontró suficiente información en la web sobre el tema proporcionado.");
        }

        return await generateQuizFromText(groundedText, questionCount, difficulty, instructions, numberOfOptions);

    } catch (error) {
        throw handleGeminiError(error);
    }
};

export const generateFlashcardsFromWeb = async (topic: string, cardCount: number, difficulty: QuizDifficulty, url?: string, instructions?: string): Promise<GeneratedFlashcardDeck> => {
    try {
        let groundingPrompt: string;
        if (url) {
            groundingPrompt = `Usando la búsqueda de Google, prioriza el contenido de la siguiente URL para recopilar información detallada: ${url}. Si el acceso a la URL falla, utiliza el tema "${topic}" como respaldo para una búsqueda general. La información debe ser factual y suficiente para crear un mazo de fichas de estudio de alta calidad. Resume los hallazgos en un texto coherente.`;
        } else {
            groundingPrompt = `Usando la búsqueda de Google, recopila información completa y detallada sobre el siguiente tema: "${topic}". La información debe ser factual y suficiente para crear un mazo de fichas de estudio de alta calidad. Resume los hallazgos en un texto coherente.`;
        }

        const request = {
            model: "gemini-2.5-flash",
            contents: groundingPrompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.2,
            },
        };

        const groundingResponse: GenerateContentResponse = await callGeminiWithRetries(request);
        const groundedText = groundingResponse.text;
        
        if (!groundedText || groundedText.trim().length < 50) {
            throw new Error("No se encontró suficiente información en la web sobre la fuente proporcionada.");
        }

        return await generateFlashcardsFromText(groundedText, cardCount, difficulty, instructions);

    } catch (error) {
        throw handleGeminiError(error);
    }
};

const parseQuizSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "Un título conciso y relevante para el test basado en el texto proporcionado, máximo 5-7 palabras."
        },
        questions: {
            type: Type.ARRAY,
            description: "El array de preguntas del test.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: {
                        type: Type.STRING,
                        description: "La pregunta de opción múltiple. Si la pregunta original contiene una imagen o símbolo, NO incluyas un placeholder como '[IMAGEN]' en el texto."
                    },
                    options: {
                        type: Type.ARRAY,
                        description: "Un array de al menos 2 posibles respuestas como cadenas de texto.",
                        items: { type: Type.STRING }
                    },
                    correctAnswerIndex: {
                        type: Type.INTEGER,
                        description: "El índice numérico (de 0 a N-1) de la respuesta correcta."
                    },
                    explanation: {
                        type: Type.STRING,
                        description: "Una breve explicación de por qué la respuesta es correcta."
                    },
                    pageNumberInDocument: {
                        type: Type.INTEGER,
                        description: "OBLIGATORIO. El número de página original del documento donde comienza esta pregunta, tal como se indica en los marcadores '--- INICIO PÁGINA X ---'."
                    },
                    boundingBox: {
                        type: Type.OBJECT,
                        description: "OBLIGATORIO SI SE PROPORCIONA IMAGEN. Analiza la imagen de la página. Si la pregunta o sus opciones contienen símbolos, fórmulas o cualquier formato complejo que no sea texto simple, proporciona las coordenadas NORMALIZADAS (de 0.0 a 1.0) del cuadro delimitador que engloba TODA la pregunta (enunciado y opciones). Si la pregunta es solo texto simple, omite este campo por completo.",
                        properties: {
                            x: { type: Type.NUMBER, description: "Coordenada X normalizada (izquierda) del cuadro." },
                            y: { type: Type.NUMBER, description: "Coordenada Y normalizada (superior) del cuadro." },
                            width: { type: Type.NUMBER, description: "Ancho normalizado del cuadro." },
                            height: { type: Type.NUMBER, description: "Alto normalizado del cuadro." },
                        }
                    }
                },
                required: ["question", "options", "correctAnswerIndex", "explanation", "pageNumberInDocument"]
            }
        }
    },
    required: ["title", "questions"]
};

export const parseQuizFromText = async (text: string, pageImageBase64?: string, contextImageBase64s?: string[], contextText?: string, requiresImage?: boolean): Promise<{ quiz: { title: string, questions: any[] }, invalidCount: number }> => {
     let jsonText = '';
     try {
        const parts: Part[] = [];

        let prompt = `Tu tarea es actuar como un experto en procesar documentos de tests y convertirlos a un formato JSON estructurado. Se te proporcionará un texto que puede contener hasta CUATRO secciones: "DOCUMENTO DEL TEST", "DOCUMENTO DE REFERENCIA" (opcional), "CLAVE DE RESPUESTAS" (opcional), y "CONTEXTO ADICIONAL" (opcional). El "DOCUMENTO DEL TEST" puede contener texto de varias páginas, separado por marcadores como "--- INICIO PÁGINA X ---".`;
        
        if (pageImageBase64) {
            const [, data] = pageImageBase64.split(',');
            parts.push({ inlineData: { mimeType: 'image/jpeg', data } });
            prompt += ` También se te proporcionan una o más imágenes de las páginas del documento. Úsalas como referencia visual para determinar si una pregunta contiene símbolos o formato complejo.`;
        }
        
        if (requiresImage) {
            prompt += `\n\n**INSTRUCCIÓN DE ALTA PRIORIDAD:** El usuario ha especificado que las preguntas en este documento dependen de imágenes. Es CRÍTICO que para CADA pregunta, proporciones un \`boundingBox\` que englobe todo el contenido relevante (enunciado, opciones e imagen asociada). No intentes transcribir el contenido de las imágenes. Si una pregunta es solo texto, puedes omitir el \`boundingBox\`.`;
        }

        prompt += `

**Instrucción Principal: Extrae todas las preguntas de opción múltiple del texto.**

**Cómo Procesar:**
1.  **Título:** Identifica un título general para el test. Si hay líneas que empiezan con "Tema...", úsalas para el título. Si no, crea un título conciso basado en el contenido del "DOCUMENTO DEL TEST".
2.  **Preguntas y Opciones:** Recorre el "DOCUMENTO DEL TEST" e identifica cada pregunta (normalmente numerada) con sus opciones de respuesta (a, b, c, etc.). Una pregunta es válida si tiene al menos 2 opciones. **Las preguntas pueden empezar en una página y terminar en la siguiente; tu tarea es unirlas correctamente.**
3.  **Número de Página (Regla CRÍTICA):** Para cada pregunta que extraigas, DEBES identificar el número de página original donde comienza, basándote en los marcadores "--- INICIO PÁGINA X ---" en el texto. Asigna este número al campo \`pageNumberInDocument\`. Esto es obligatorio.
4.  **Análisis de Imagen para Recorte (Regla ESTRICTA Y CRÍTICA si se proporciona una imagen):**
    - Para CADA pregunta, analiza la IMAGEN DE PÁGINA correspondiente a su \`pageNumberInDocument\`.
    - Si la pregunta, sus opciones o cualquier parte relevante del enunciado contiene **símbolos, fórmulas, gráficos o formato complejo** que no se puede representar como texto simple, DEBES calcular y proporcionar un \`boundingBox\`.
    - El \`boundingBox\` debe ser un cuadro preciso que englobe el ENUNCIADO COMPLETO de la pregunta Y TODAS sus OPCIONES.
    - Las coordenadas (x, y, width, height) deben estar NORMALIZADAS (valores entre 0.0 y 1.0).
    - Si la pregunta es **solo texto simple** y no necesita una imagen para ser entendida, OMITE el campo \`boundingBox\` por completo.
5.  **Respuesta Correcta (Reglas de Prioridad ESTRICTA):**
    a. **MÁXIMA PRIORIDAD - CLAVE DE RESPUESTAS:** Si la sección "CLAVE DE RESPUESTAS" existe, es la fuente de verdad absoluta. Usa esta clave para determinar la respuesta correcta (ej: "1. a", "2. c"). Mapea la letra a su índice numérico (a=0, b=1, c=2, d=3, e=4).
    b. **SEGUNDA PRIORIDAD - Clave al Final del Documento:** Si no hay una sección de clave separada, busca una lista de respuestas al final del "DOCUMENTO DEL TEST".
    c. **TERCERA PRIORIDAD - Formato en el Texto y Contexto:** Si no hay ninguna clave explícita, analiza el "DOCUMENTO DEL TEST" y el "CONTEXTO ADICIONAL". La respuesta correcta puede estar indicada por formato (negrita, subrayado, etc.).
6.  **Uso de Documento de Referencia y Contexto:**
    a. Usa el "DOCUMENTO DE REFERENCIA" (si existe) para verificar la exactitud de la respuesta.
    b. Usa el "CONTEXTO ADICIONAL" (si existe) para guiar la extracción.
    c. Si la "CLAVE DE RESPUESTAS" contradice al "DOCUMENTO DE REFERENCIA", **confía siempre en la "CLAVE DE RESPUESTAS"** y añade la nota "Pregunta para revisar:" al principio de la \`explanation\`.
7.  **Robustez:** Es preferible omitir una única pregunta que no puedas procesar con seguridad a devolver un test completamente vacío. No devuelvas un array de preguntas vacío a menos que el texto de entrada no contenga ninguna pregunta.

**Regla de Formato Crítica:**
Al generar el JSON, si cualquier texto que extraes del documento contiene comillas dobles ("), DEBES escaparlas con una barra invertida (ejemplo: \\").

El contenido del documento es el siguiente:
---
${text}
${contextText ? `\n--- CONTEXTO ADICIONAL ---\n${contextText}\n` : ''}
---
`;
        parts.unshift({ text: prompt });

        const request = {
            model: "gemini-2.5-flash",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: parseQuizSchema,
                temperature: 0.1,
            },
        };

        const response: GenerateContentResponse = await callGeminiWithRetries(request);
        
        jsonText = response.text.trim();
        const quizData = JSON.parse(jsonText);
        
        if (typeof quizData.title !== 'string' || !Array.isArray(quizData.questions)) {
            throw new Error("La API no devolvió un título y un array de preguntas válidos.");
        }
        
        const originalCount = quizData.questions.length;
        const validQuestions = quizData.questions.filter((item: any) =>
            typeof item.question === 'string' &&
            Array.isArray(item.options) &&
            item.options.length >= 2 &&
            typeof item.correctAnswerIndex === 'number' &&
            item.correctAnswerIndex >= 0 && item.correctAnswerIndex < item.options.length &&
            typeof item.explanation === 'string' &&
            typeof item.pageNumberInDocument === 'number'
        );
        const invalidCount = originalCount - validQuestions.length;
        
        return { quiz: { title: quizData.title, questions: validQuestions }, invalidCount };

    } catch (error) {
        throw handleGeminiError(error, jsonText);
    }
};

export const getTextFromWeb = async (url?: string, topic?: string): Promise<{ content: string; title: string }> => {
    try {
        if (!url && !topic) {
            throw new Error("Se requiere una URL o un tema para la búsqueda.");
        }

        const prompt = `Usando la búsqueda de Google, recopila y resume la información de la siguiente fuente: "${url || topic}". El resumen debe ser completo, detallado y estar bien estructurado para que un tutor de IA pueda usarlo para responder preguntas.`;

        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.2,
            },
        };

        const response: GenerateContentResponse = await callGeminiWithRetries(request);

        const content = response.text;
        
        if (!content || content.trim().length < 50) {
            throw new Error("No se encontró suficiente información en la web sobre la fuente proporcionada.");
        }

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const title = groundingChunks?.[0]?.web?.title || url || topic || 'Fuente Web';

        return { content, title };

    } catch (error) {
        throw handleGeminiError(error);
    }
};


// --- Mnemonic Helper Functions ---

export const generateWordsForNumbers = async (numbers: string[]): Promise<{number: string, letters: string, words: string[]}[]> => {
    let jsonText = '';
    try {
        const prompt = `Usando el sistema mnemotécnico fonético de Ramón Campayo (0=R/RR, 1=T/D, 2=N/Ñ, 3=M, 4=C/Q/K, 5=L/LL, 6=S/Z, 7=F, 8=G/J, 9=P/B/V), procesa la siguiente lista de números: [${numbers.join(', ')}].

        Para cada número de la lista, proporciona:
        1. El número original como una cadena de texto.
        2. Una cadena con las letras fonéticas correspondientes, separadas por guiones.
        3. Una lista de al menos 5 palabras o frases cortas que codifiquen fonéticamente esa secuencia de letras.

        Devuelve la respuesta como un array de objetos JSON. Cada objeto debe tener las claves "number", "letters" y "words" (que será un array de strings).
        Ejemplo para [ "1", "50" ]: [{"number": "1", "letters": "T/D", "words": ["té", "tía", "día", "do", "ata"]}, {"number": "50", "letters": "L/LL - R/RR", "words": ["loro", "lar", "lira", "oler", "olor"]}]`;
        
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.STRING },
                    letters: { type: Type.STRING },
                    words: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["number", "letters", "words"]
                }
              },
            }
        };

        const response = await callGeminiWithRetries(request);
        jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        throw handleGeminiError(error, jsonText);
    }
};

export const generateStoryFromWords = async (words: string, context?: string): Promise<string> => {
    try {
        const prompt = `Crea una historia corta, vívida, y memorable (incluso absurda) que conecte las siguientes palabras clave en orden: ${words}. La historia debe ser fácil de visualizar.${context ? ` Ten en cuenta esta sugerencia adicional para la historia: ${context}` : ''}`;
        
        const request = {
            model: "gemini-2.5-flash",
            contents: prompt
        };
        const response = await callGeminiWithRetries(request);
        return response.text || '';
    } catch (error) {
        throw handleGeminiError(error);
    }
};

export const generateImageForStory = async (story: string): Promise<string> => {
    try {
        const localAi = getClient();
        const prompt = `Crea una ilustración de estilo cómic o caricatura que represente la siguiente escena: ${story}. La imagen debe ser clara y enfocarse en los elementos clave de la historia para ayudar a la memorización.`;
        
        // Note: generateImages is a different endpoint and might not use the same retry wrapper
        // For simplicity, we'll call it directly. A more robust solution would wrap this too.
        const response = await localAi.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });
        await delay(API_CALL_DELAY_MS);

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error("No se pudo generar una imagen.");
    } catch(error) {
        throw handleGeminiError(error);
    }
};

export const generateComparisonChart = async (context: string): Promise<string> => {
    try {
        const prompt = `Crea una tabla comparativa detallada en formato Markdown sobre los siguientes conceptos o pregunta: "${context}". La tabla debe tener cabeceras claras y filas que resalten las diferencias y similitudes clave. Si se proporciona una pregunta, la tabla debe comparar los elementos clave dentro de esa pregunta.`;

        const request = {
            model: "gemini-2.5-flash",
            contents: prompt,
        };
        const response = await callGeminiWithRetries(request);
        return response.text || '';
    } catch (error) {
        throw handleGeminiError(error);
    }
};

// --- Omni-Coach Functions ---

const buildAppDataSummary = (appData: AppData): string => {
    const activeLibraryId = appData.activeLibraryId;
    if (!activeLibraryId || !appData.libraries[activeLibraryId]) {
        return "El usuario no tiene una biblioteca activa.";
    }

    const activeLibrary = appData.libraries[activeLibraryId];
    
    const flattenItems = (items: LibraryItem[]): LibraryItem[] => {
        let flatList: LibraryItem[] = [];
        items.forEach(item => {
            flatList.push(item);
            if (item.type === 'folder') {
                flatList = flatList.concat(flattenItems(item.children));
            }
        });
        return flatList;
    };
    
    const allItems = flattenItems(activeLibrary.library || []);
    const quizzes = allItems.filter(item => item.type === 'quiz');
    const decks = allItems.filter(item => item.type === 'deck');
    
    const flattenDocuments = (items: DocumentItem[]): DocumentItem[] => {
        let flatList: DocumentItem[] = [];
        items.forEach(item => {
            flatList.push(item);
            if (item.type === 'folder') {
                flatList = flatList.concat(flattenDocuments(item.children));
            }
        });
        return flatList;
    };
    
    const allDocuments = flattenDocuments(activeLibrary.documentLibrary || []);
    const files = allDocuments.filter(item => item.type === 'file');
    const urls = allDocuments.filter(item => item.type === 'url');

    let summary = `Resumen del Estado Actual de la Aplicación del Usuario:\n\n`;
    summary += `- Biblioteca Activa: "${activeLibrary.name}" (ID: ${activeLibrary.id})\n`;
    summary += `- Número total de bibliotecas: ${Object.keys(appData.libraries).length}\n`;
    summary += `- Contenido en la biblioteca activa:\n`;
    summary += `  - ${quizzes.length} tests.\n`;
    summary += `  - ${decks.length} mazos de fichas.\n`;
    summary += `  - ${files.length} archivos en el gestor de contenido.\n`;
    summary += `  - ${urls.length} URLs en el gestor de contenido.\n`;
    summary += `- Progreso del Usuario:\n`;
    summary += `  - ${activeLibrary.failedQuestions?.length || 0} preguntas en la cola de repaso (SRS).\n`;
    summary += `  - ${activeLibrary.allTimeFailedQuestionIds?.length || 0} preguntas falladas en total.\n`;
    
    if ((quizzes.length + decks.length) > 0) {
        summary += `\nLista de Tests y Fichas Disponibles (título, id, tipo):\n`;
        allItems.slice(0, 15).forEach(item => { // Limit to first 15 to keep it concise
            if (item.type === 'quiz' || item.type === 'deck') {
                summary += `  - "${item.title}", "${item.id}", "${item.type}"\n`;
            } else if (item.type === 'folder') {
                 summary += `  - Carpeta: "${item.name}", "${item.id}", "${item.type}"\n`;
            }
        });
        if (allItems.length > 15) {
            summary += `  - ... y ${allItems.length - 15} más.\n`;
        }
    }
    
    if (files.length > 0) {
        summary += `\nLista de Archivos Disponibles (nombre, id):\n`;
        files.slice(0, 10).forEach(file => {
             if(file.type === 'file') {
                 summary += `  - "${file.name}", "${file.id}"\n`;
             }
        });
        if (files.length > 10) {
            summary += `  - ... y ${files.length - 10} más.\n`;
        }
    }

    return summary;
};


export const createOmniCoachChatSession = (appData: AppData, settings: Settings): Chat => {
    const localAi = getClient();
    const appDataSummary = buildAppDataSummary(appData);

    let knowledgeBaseUrlsText = '';
    if (settings.coachKnowledgeBaseUrls && settings.coachKnowledgeBaseUrls.length > 0) {
        knowledgeBaseUrlsText = `\nPrioriza la información de las siguientes URLs como base de conocimiento principal:\n${settings.coachKnowledgeBaseUrls.map(url => `- ${url}`).join('\n')}`;
    }

    const systemInstruction = `Eres "Omni-Coach", un asistente de estudio experto integrado en la aplicación "QUEENZZ". Tu objetivo es ayudar al usuario a gestionar su estudio de manera eficiente. Tienes acceso al estado actual de su aplicación (bibliotecas, tests, progreso) y puedes ejecutar acciones en su nombre.

**Tu Contexto (Estado Actual de la App):**
${appDataSummary}
${knowledgeBaseUrlsText}

**Tus Capacidades (Herramientas):**
- Puedes navegar por la aplicación (\`navigateTo\`).
- Puedes iniciar tests y fichas (\`startQuiz\`, \`startFlashcardDeck\`).
- Puedes gestionar el contenido: buscar, crear, eliminar y renombrar (\`findItems\`, \`createQuiz\`, \`deleteItems\`, \`renameItem\`).
- Puedes iniciar sesiones de práctica y retos (\`startPracticeSession\`, \`startChallenge\`).
- Puedes leer archivos y URLs del usuario (\`readFileContent\`, \`readUrlContent\`) para responder preguntas sobre su contenido.

**Cómo Interactuar:**
1.  **Sé Proactivo y Conversacional:** No eres solo un ejecutor de comandos. Habla con el usuario de forma natural. Si una orden es ambigua (ej. "elimina el test de historia"), usa \`findItems\` primero para confirmar a qué se refiere si hay múltiples coincidencias.
2.  **Confirma las Acciones:** Antes de realizar una acción destructiva como \`deleteItems\`, confirma con el usuario.
3.  **Usa el Contexto:** Basa tus respuestas y sugerencias en el estado actual de la aplicación que se te ha proporcionado. Por ejemplo, si ves que hay muchas preguntas falladas, sugiere una sesión de repaso (\`startPracticeSession\`).
4.  **Piensa Paso a Paso:** Cuando una solicitud requiera varias herramientas, planifica tus acciones. Por ejemplo, para "renombra 'Test Antiguo' a 'Test Final'": 1. Llama a \`findItems\` con "Test Antiguo". 2. Si se encuentra un resultado, llama a \`renameItem\` con el ID y el nuevo nombre.
5.  **Responde en Español.**`;

    return localAi.chats.create({
        model: "gemini-2.5-flash",
        config: {
            systemInstruction,
            tools: [{ functionDeclarations: tools }],
        },
    });
};