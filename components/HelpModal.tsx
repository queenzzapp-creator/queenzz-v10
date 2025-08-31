import React from 'react';
import { XMarkIcon, BookOpenIcon } from './Icons.tsx';

interface HelpModalProps {
    onClose: () => void;
}

const HelpSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 border-b-2 border-lime-500 pb-1">{title}</h3>
        <div className="space-y-3 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            {children}
        </div>
    </div>
);

const Shortcut: React.FC<{ keys: string, desc: string }> = ({ keys, desc }) => (
    <li><strong className="font-semibold text-slate-800 dark:text-slate-100 font-mono bg-slate-200 dark:bg-slate-700 py-0.5 px-1.5 rounded-md text-xs">{keys}</strong>: {desc}</li>
);

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="relative bg-[#FAF8F1] dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <BookOpenIcon className="h-7 w-7 text-lime-500" />
                        Manual de Usuario
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </header>

                <main className="flex-grow p-6 overflow-y-auto">
                    <HelpSection title="Bienvenida a QUEENZZ">
                        <p>Esta guía te ayudará a sacar el máximo provecho de todas las herramientas. ¡Vamos a empezar!</p>
                    </HelpSection>

                    <HelpSection title="Añadir Contenido">
                        <p>Puedes añadir material de estudio de tres formas principales desde el botón <span className="font-bold text-lime-600">(+)</span> en la biblioteca:</p>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li><strong>Generar con IA:</strong> La forma más potente. Puedes crear tests o fichas a partir de texto pegado, subiendo un archivo (PDF, DOCX, TXT), desde un archivo ya guardado en tu Gestor de Contenido, o directamente desde un tema o URL de la web.</li>
                            <li><strong>Crear Manualmente:</strong> Te da control total para escribir tus propias preguntas de test o fichas de estudio una por una.</li>
                            <li><strong>Importar PDF:</strong> Diseñado para procesar PDFs de tests existentes. La IA extraerá las preguntas, opciones y buscará las respuestas correctas, incluso si están en una hoja de respuestas separada.</li>
                        </ul>
                    </HelpSection>
                    
                    <HelpSection title="La Biblioteca Principal">
                        <p>Es tu centro de mando. Aquí puedes ver y organizar todo tu contenido.</p>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li><strong>Organización:</strong> Crea <span className="font-bold">carpetas</span> para agrupar tus tests y fichas.</li>
                            <li><strong>Renombrar:</strong> Haz <span className="font-bold">doble clic</span> en cualquier elemento para cambiarle el nombre directamente.</li>
                            <li><strong>Selección y Acciones:</strong> Haz <span className="font-bold">clic derecho</span> en cualquier elemento (o en el fondo) para ver un menú de acciones contextuales como Renombrar, Mover, Eliminar, etc. También puedes mantener pulsado un elemento para activar la selección múltiple.</li>
                            <li><strong>Iniciar un Test:</strong> Simplemente haz clic en un test para abrir la pantalla de configuración y empezar.</li>
                            <li><strong>Importar/Exportar:</strong> Usa los botones en la parte inferior para guardar una copia de seguridad de tu biblioteca (JSON) o para importar una previamente guardada.</li>
                        </ul>
                    </HelpSection>

                    <HelpSection title="Atajos de Teclado">
                        <p><strong>Generales:</strong></p>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <Shortcut keys="Ctrl/Cmd + Z" desc="Deshacer la última acción." />
                            <Shortcut keys="Ctrl/Cmd + Y" desc="Rehacer la última acción deshecha." />
                            <Shortcut keys="Esc" desc="Cierra ventanas, cancela una acción o deselecciona todo." />
                            <Shortcut keys="Ctrl/Cmd + N" desc="Abre la pantalla de 'Añadir Contenido'." />
                            <Shortcut keys="Shift + Clic" desc="Selecciona un rango de elementos en la biblioteca." />
                        </ul>
                         <p className="mt-4"><strong>Durante un Test:</strong></p>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <Shortcut keys="→ / Espacio" desc="Siguiente pregunta." />
                            <Shortcut keys="← / Ctrl+Z" desc="Pregunta anterior." />
                            <Shortcut keys="1, 2, 3, 4, 5" desc="Seleccionar la respuesta A, B, C, D, E." />
                            <Shortcut keys="Enter" desc="Avanzar a la siguiente pregunta (si la respuesta está visible) o finalizar el test en la última pregunta." />
                            <Shortcut keys="Esc" desc="Pausar el test." />
                            <Shortcut keys="↑ / ↓" desc="Desplazarse por el contenido de la pregunta." />
                        </ul>
                    </HelpSection>

                    <HelpSection title="Módulos y Herramientas">
                        <p>Puedes activar o desactivar los iconos de acceso rápido a estos módulos desde <span className="font-bold">Configuración &gt; Módulos</span>.</p>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li><strong>Panel de Estadísticas:</strong> En la biblioteca, te muestra un resumen de tus preguntas acertadas, falladas, en blanco y las que tienes que repasar (SRS). Haz clic en cualquiera para iniciar una sesión de práctica.</li>
                            <li><strong>Ayudante de Estudio:</strong> Una herramienta de memorización. Crea reglas mnemotécnicas con historias e imágenes generadas por IA para las preguntas que más te cuestan, o genera cuadros comparativos para aclarar conceptos complejos.</li>
                            <li><strong>Planificador de Estudio:</strong> Organiza tu temario en bloques, asigna documentos y define un ritmo. La app generará un calendario de estudio diario y te creará tests a medida para cada sesión.</li>
                            <li><strong>Análisis de Progreso:</strong> Visualiza tu rendimiento con gráficos detallados: tu progreso general, tu dominio por cada tema y tu constancia de estudio en los últimos 30 días.</li>
                            <li><strong>Gestor de Contenido:</strong> Almacena y organiza tus archivos PDF, DOCX y TXT sin necesidad de subirlos cada vez.</li>
                        </ul>
                    </HelpSection>

                     <HelpSection title="Búsqueda Avanzada y Duplicados">
                        <p>Usa el icono de la lupa en la biblioteca para acceder a una búsqueda potente.</p>
                         <ul className="list-disc list-inside space-y-2 pl-4">
                            <li><strong>Filtros:</strong> Busca por texto, estado (acertada, fallada), banderitas o limita la búsqueda a carpetas o tests específicos.</li>
                            <li><strong>Gestión de Duplicados:</strong> Activa la opción "Mostrar solo duplicadas" para encontrar preguntas idénticas. Puedes seleccionarlas para eliminarlas o suspenderlas (ocultarlas de los tests sin borrarlas).</li>
                            <li><strong>Acciones en Lote:</strong> Selecciona varias preguntas de los resultados de búsqueda para moverlas a otro test, eliminarlas o añadirles una banderita.</li>
                        </ul>
                    </HelpSection>
                </main>
            </div>
        </div>
    );
};

export default HelpModal;
