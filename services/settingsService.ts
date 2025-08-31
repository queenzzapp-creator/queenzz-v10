import { Settings, ChallengeSettings } from '../types';

const SETTINGS_KEY = 'queenzz_settings';

const defaultSettings: Settings = {
    theme: 'light',
    vision: 'default',
    // FIX: Add missing 'saveMode' property to satisfy the Settings type.
    saveMode: 'auto',
    showStats: true,
    cloudSyncEnabled: false,
    defaultQuizSettings: {
        mode: 'none',
        duration: 600, // Default 10 minutes for total, 60s for per question
        showAnswers: 'immediately',
        penaltySystem: 'standard',
        shuffleQuestions: false,
        shuffleOptions: false,
    },
    defaultNumberOfOptions: 4,
    alwaysConfigureQuiz: true,
    saveCustomTests: false,
    showProgressView: true,
    showPlanner: true,
    showDocumentManager: true,
    showMnemonicHelper: true,
    showStudyCoach: true,
    srsGraduationRequirement: 3,
    // FIX: Add missing 'srsIntervals' property to satisfy the Settings type.
    srsIntervals: [1, 3, 7, 14, 30, 90],
    challengeSettings: {
        weeklyQuestionCount: 20,
        monthlyQuestionCount: 50,
    },
    coachKnowledgeBaseUrls: [],
};

/**
 * Retrieves user settings from localStorage.
 * @returns The user's settings object.
 */
export const getSettings = (): Settings => {
    try {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
             // Deep merge with defaults to ensure all keys are present, especially nested ones
            const mergedSettings: Settings = {
                ...defaultSettings,
                ...parsed,
                defaultQuizSettings: {
                    ...defaultSettings.defaultQuizSettings,
                    ...(parsed.defaultQuizSettings || {})
                },
                challengeSettings: {
                    ...defaultSettings.challengeSettings,
                    ...(parsed.challengeSettings || {})
                },
                // FIX: Add merge logic for the 'saveMode' property.
                vision: parsed.vision ?? defaultSettings.vision,
                saveMode: parsed.saveMode ?? defaultSettings.saveMode,
                defaultNumberOfOptions: parsed.defaultNumberOfOptions ?? defaultSettings.defaultNumberOfOptions,
                alwaysConfigureQuiz: parsed.alwaysConfigureQuiz ?? defaultSettings.alwaysConfigureQuiz,
                saveCustomTests: parsed.saveCustomTests ?? defaultSettings.saveCustomTests,
                showProgressView: parsed.showProgressView ?? defaultSettings.showProgressView,
                showPlanner: parsed.showPlanner ?? defaultSettings.showPlanner,
                showDocumentManager: parsed.showDocumentManager ?? defaultSettings.showDocumentManager,
                showMnemonicHelper: parsed.showMnemonicHelper ?? defaultSettings.showMnemonicHelper,
                showStudyCoach: parsed.showStudyCoach ?? defaultSettings.showStudyCoach,
                srsGraduationRequirement: parsed.srsGraduationRequirement ?? defaultSettings.srsGraduationRequirement,
                // FIX: Add 'srsIntervals' to the merge logic.
                srsIntervals: parsed.srsIntervals ?? defaultSettings.srsIntervals,
                coachKnowledgeBaseUrls: parsed.coachKnowledgeBaseUrls ?? defaultSettings.coachKnowledgeBaseUrls,
            };
            return mergedSettings;
        }
    } catch (error) {
        console.error("Failed to parse settings, using defaults.", error);
    }
    return defaultSettings;
};

/**
 * Saves user settings to localStorage.
 * @param settings The settings object to save.
 */
export const saveSettings = (settings: Settings): void => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save settings to localStorage.", error);
    }
};