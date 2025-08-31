import { StudyPlanSession, StudyPlanConfig, StoredFileItem, StudyBlock } from "../types";

/**
 * Filters the study plan to get sessions scheduled for today that are not completed.
 * @param sessions The full array of study plan sessions.
 * @returns An array of sessions for today.
 */
export const getTodaysSessions = (sessions: StudyPlanSession[]): StudyPlanSession[] => {
    const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD
    return sessions.filter(session => session.date === today && !session.completed);
};


/**
 * Generates a detailed study plan based on user configuration and syllabus files.
 * @param config The user's study plan configuration.
 * @param syllabusFiles An array of the selected StoredFile objects.
 * @returns An array of generated StudyPlanSession objects.
 */
export const generateStudyPlan = (config: StudyPlanConfig, syllabusFiles: StoredFileItem[]): StudyPlanSession[] => {
    const { blocks } = config;
    if (blocks.length === 0 || blocks.every(b => b.studyDays.length === 0)) return [];

    const sessions: StudyPlanSession[] = [];
    const fileMap = new Map(syllabusFiles.map(f => [f.id, f]));

    const blocksWithPacing = blocks.map(block => {
        if (block.pacingMode === 'examDate' && block.examDate && block.studyDays.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const examDate = new Date(block.examDate);
            examDate.setHours(23, 59, 59, 999);

            if (examDate < today) return { ...block, pagesPerSession: 10 };

            let availableStudyDays = 0;
            let tempDate = new Date(today);
            while (tempDate <= examDate) {
                if (block.studyDays.includes(tempDate.getDay())) {
                    availableStudyDays++;
                }
                tempDate.setDate(tempDate.getDate() + 1);
            }
            
            const blockFiles = block.fileIds.map(id => fileMap.get(id)).filter((f): f is StoredFileItem => !!f && f.pageCount! > 0);
            const totalPages = blockFiles.reduce((sum, file) => sum + (file.pageCount || 0), 0) * block.laps;

            if (availableStudyDays > 0 && totalPages > 0) {
                const calculatedPages = Math.ceil(totalPages / availableStudyDays);
                return { ...block, pagesPerSession: Math.max(1, calculatedPages) };
            }
        }
        return { ...block, pagesPerSession: Math.max(1, block.pagesPerSession) };
    });
    
    const blockProgress = new Map<string, { pagesStudied: number; currentLap: number }>(
        blocksWithPacing.map(b => [b.id, { pagesStudied: 0, currentLap: 1 }])
    );
    
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365 * 2; i++) { // Limit to 2 years to prevent infinite loops
        let allBlocksComplete = true;

        const currentDayOfWeek = currentDate.getDay(); // 0 for Sunday, 1 for Monday, etc.
        const scheduledBlocks = blocksWithPacing.filter(b => b.studyDays.includes(currentDayOfWeek));

        for (const block of scheduledBlocks) {
            const progress = blockProgress.get(block.id)!;
            if (progress.currentLap > block.laps) {
                continue; // This block is finished
            }
            allBlocksComplete = false;

            const blockFiles = block.fileIds.map(id => fileMap.get(id)).filter((f): f is StoredFileItem => !!f && f.pageCount! > 0);
            if (blockFiles.length === 0) {
                 blockProgress.set(block.id, { ...progress, currentLap: block.laps + 1 });
                 continue;
            }

            const totalBlockPages = blockFiles.reduce((sum, file) => sum + (file.pageCount || 0), 0);
            
            let pagesRemainingForDay = block.pagesPerSession;
            let pagesStudiedInLap = progress.pagesStudied;

            let pagesTraversedForFileFind = 0;
            for (const file of blockFiles) {
                const filePageCount = file.pageCount || 0;
                const startPageOfFileInLap = pagesTraversedForFileFind;
                const endPageOfFileInLap = startPageOfFileInLap + filePageCount;
                
                if (pagesStudiedInLap < endPageOfFileInLap) {
                    const startPageInFile = (pagesStudiedInLap - startPageOfFileInLap) + 1;
                    const pagesLeftInFile = filePageCount - startPageInFile + 1;
                    const pagesForThisSession = Math.min(pagesRemainingForDay, pagesLeftInFile);
                    const endPageInFile = startPageInFile + pagesForThisSession - 1;

                    if (pagesForThisSession > 0) {
                         sessions.push({
                            id: crypto.randomUUID(),
                            date: currentDate.toISOString().split('T')[0],
                            blockId: block.id,
                            blockName: block.name,
                            fileId: file.id,
                            fileName: file.name,
                            startPage: startPageInFile,
                            endPage: endPageInFile,
                            lap: progress.currentLap,
                            completed: false,
                            blockColor: block.color,
                            questionsPerSession: block.questionsPerSession,
                        });
                    }
                    
                    progress.pagesStudied += pagesForThisSession;
                    
                    if (progress.pagesStudied >= totalBlockPages) {
                        progress.currentLap++;
                        progress.pagesStudied = 0;
                    }
                    blockProgress.set(block.id, progress);
                    break;
                }
                pagesTraversedForFileFind += filePageCount;
            }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
        if (allBlocksComplete) {
            break;
        }
    }

    return sessions;
};