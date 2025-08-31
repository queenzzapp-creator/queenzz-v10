import { FunctionDeclaration, Type } from "@google/genai";

export const tools: FunctionDeclaration[] = [
    {
        name: 'navigateTo',
        description: 'Navega a una vista específica dentro de la aplicación. Utilízalo cuando el usuario pida ver algo, como "muéstrame mis tests" o "abre el planificador".',
        parameters: {
            type: Type.OBJECT,
            properties: {
                view: {
                    type: Type.STRING,
                    description: 'La vista a la que navegar.',
                    enum: ['library', 'planner', 'progress', 'documents', 'mnemonic_helper', 'create_content']
                }
            },
            required: ['view']
        }
    },
    {
        name: 'startQuiz',
        description: 'Inicia un test. Utilízalo cuando el usuario pida explícitamente empezar un test por su nombre o ID. Si el usuario pide empezar un test por nombre, primero usa `findItems` para obtener el ID correcto.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                quizId: { type: Type.STRING, description: 'El ID del test a iniciar.' },
                quizName: { type: Type.STRING, description: 'El nombre del test a iniciar. La IA debe intentar encontrar el ID primero.' }
            },
        }
    },
    {
        name: 'startFlashcardDeck',
        description: 'Inicia una sesión de estudio de fichas (flashcards). Si el usuario pide empezar por nombre, primero usa `findItems` para obtener el ID correcto.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                deckId: { type: Type.STRING, description: 'El ID del mazo de fichas a iniciar.' },
                deckName: { type: Type.STRING, description: 'El nombre del mazo de fichas a iniciar.' }
            }
        }
    },
    {
        name: 'findItems',
        description: 'Busca tests, carpetas o fichas en la biblioteca del usuario por un término de búsqueda. Úsalo para obtener los IDs de los elementos antes de ejecutar acciones como `startQuiz`, `startFlashcardDeck`, `deleteItems`, o `renameItem`.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: 'El término de búsqueda.' }
            },
            required: ['query']
        }
    },
    {
        name: 'createQuiz',
        description: 'Crea un nuevo test buscando información en la web sobre un tema proporcionado por el usuario.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                topic: { type: Type.STRING, description: 'El tema sobre el que se creará el test.' },
                questionCount: { type: Type.INTEGER, description: 'El número de preguntas a generar. Por defecto 10.' },
            },
            required: ['topic']
        }
    },
     {
        name: 'createFlashcards',
        description: 'Crea un nuevo mazo de fichas de estudio buscando información en la web sobre un tema proporcionado por el usuario.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                topic: { type: Type.STRING, description: 'El tema sobre el que se creará el mazo de fichas.' },
                cardCount: { type: Type.INTEGER, description: 'El número de fichas a generar. Por defecto 10.' },
            },
            required: ['topic']
        }
    },
    {
        name: 'deleteItems',
        description: 'Elimina uno o más tests, carpetas o mazos de fichas de la biblioteca del usuario, buscándolos por su nombre. Acepta una lista de nombres de elementos a eliminar.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                itemNames: {
                    type: Type.ARRAY,
                    description: 'Una lista de los nombres de los elementos a eliminar.',
                    items: { type: Type.STRING }
                }
            },
            required: ['itemNames']
        }
    },
    {
        name: 'renameItem',
        description: 'Renombra un test, carpeta o mazo de fichas en la biblioteca del usuario.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                itemName: { type: Type.STRING, description: 'El nombre actual del elemento a renombrar.'},
                newName: { type: Type.STRING, description: 'El nuevo nombre para el elemento.' }
            },
            required: ['itemName', 'newName']
        }
    },
    {
        name: 'startPracticeSession',
        description: 'Inicia una sesión de práctica especial basada en el historial de respuestas del usuario.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                type: {
                    type: Type.STRING,
                    description: 'El tipo de sesión de práctica a iniciar.',
                    enum: ['srs', 'failed', 'unanswered', 'correct']
                }
            },
            required: ['type']
        }
    },
    {
        name: 'startChallenge',
        description: 'Inicia un reto de preguntas aleatorias.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                type: {
                    type: Type.STRING,
                    description: 'El tipo de reto a iniciar.',
                    enum: ['weekly', 'monthly']
                }
            },
            required: ['type']
        }
    },
     {
        name: 'getTodaysStudySessions',
        description: 'Obtiene las sesiones de estudio planificadas para el día de hoy. Útil si el usuario pregunta "¿qué toca estudiar hoy?".',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'readFileContent',
        description: 'Lee el contenido de un archivo específico guardado por el usuario en su gestor de contenido. Usa esto cuando la pregunta del usuario se refiera a un tema que coincide con el nombre de un archivo guardado.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                fileName: {
                    type: Type.STRING,
                    description: "El nombre exacto del archivo a leer, por ejemplo 'resumen_tema_1.pdf'."
                }
            },
            required: ['fileName']
        }
    },
     {
        name: 'readUrlContent',
        description: 'Lee y resume el contenido de una URL específica proporcionada por el usuario o de su lista de URLs guardadas.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                url: {
                    type: Type.STRING,
                    description: "La URL de la cual leer el contenido."
                }
            },
            required: ['url']
        }
    },
    {
        name: 'addUrl',
        description: 'Añade una nueva URL de referencia al gestor de contenido del usuario.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                url: {
                    type: Type.STRING,
                    description: "La URL completa a añadir."
                }
            },
            required: ['url']
        }
    },
    {
        name: 'startImport',
        description: 'Inicia el proceso de importación de una biblioteca desde un archivo JSON. Esta acción abrirá un selector de archivos para que el usuario elija su copia de seguridad.',
        parameters: { type: Type.OBJECT, properties: {} }
    }
];
