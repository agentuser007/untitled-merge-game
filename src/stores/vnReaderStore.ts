// ============================================================
// vnReaderStore.ts — Visual Novel Reader State Store
// ============================================================
// Replaces VNReader from js/vn-reader.js
// Manages VN story state: current line, typing, auto/skip,
// history, and BGM transitions.
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { useConfigStore } from './configStore';
import { useI18nStore } from './i18nStore';
import type { VNReaderSerializeData } from '../types/serialize';

// --- Character info derived from configStore.characterProfiles ---
export interface CharacterInfo {
    avatar: string;
    color: string;
    background: string;
    name: string;
    nameEn: string;
}

// --- Story data types ---
export interface VNLine {
    speakerId: string | null;
    text: string;
    expression?: string;
}

export interface VNStory {
    title: string;
    lines: VNLine[];
    text?: string;
}

export interface VNCGEntry {
    cgId: string;
    title: string;
    maleLeadId: string;
    stories: VNStory[];
}

export interface VNHistoryEntry {
    speaker: string;
    speakerId: string | null;
    text: string;
}

// --- Helper: look up character info from configStore ---
function getCharacterInfo(characterId: string | null): CharacterInfo | null {
    if (!characterId) return null;
    const configStore = useConfigStore();
    const profile = configStore.characterProfiles[characterId];
    if (!profile) return null;
    return {
        avatar: profile.avatar || '',
        color: profile.color || '#888',
        background: profile.background || '',
        name: profile.name || characterId,
        nameEn: profile.nameEn || profile.name || characterId,
    };
}

function getSpeakerDisplayName(speakerId: string | null): string {
    if (!speakerId) return '';
    const configStore = useConfigStore();
    const i18nStore = useI18nStore();
    const profile = configStore.characterProfiles[speakerId];
    if (!profile) return speakerId;
    return i18nStore.locale === 'en' ? (profile.nameEn || profile.name || speakerId) : (profile.name || speakerId);
}

export const useVNReaderStore = defineStore('vnReader', () => {
    // --- State ---
    const isOpen = ref(false);
    const ssrId = ref('');
    const storyIndex = ref(0);
    const lines = ref<VNLine[]>([]);
    const currentIndex = ref(0);
    const isTyping = ref(false);
    const autoMode = ref(false);
    const skipMode = ref(false);
    const autoDelay = 3000;
    const skipDelay = 80;
    const typingSpeed = 45;
    const history = ref<VNHistoryEntry[]>([]);
    const showingHistory = ref(false);
    const currentSpeaker = ref<string | null>(null);
    const ended = ref(false);
    const showingTitle = ref(false);

    // --- Computed ---
    const currentLine = computed<VNLine | null>(() => {
        if (currentIndex.value >= lines.value.length) return null;
        return lines.value[currentIndex.value];
    });

    const currentCG = computed<VNCGEntry | null>(() => {
        const configStore = useConfigStore();
        const cg = configStore.cgStories[ssrId.value];
        return cg || null;
    });

    const currentStory = computed<VNStory | null>(() => {
        if (!currentCG.value) return null;
        return currentCG.value.stories[storyIndex.value] || null;
    });

    const currentCharacterInfo = computed<CharacterInfo | null>(() => {
        if (!currentCG.value) return null;
        return getCharacterInfo(currentCG.value.maleLeadId);
    });

    const speakerInfo = computed<{ name: string; color: string; isNarrator: boolean; background: string | null }>(() => {
        const i18nStore = useI18nStore();
        const line = currentLine.value;
        if (!line) {
            return { name: '', color: '#888', isNarrator: false, background: null };
        }
        if (line.speakerId) {
            const ci = getCharacterInfo(line.speakerId);
            return {
                name: getSpeakerDisplayName(line.speakerId),
                color: ci?.color || '#888',
                isNarrator: false,
                background: ci?.background || null,
            };
        }
        return {
            name: i18nStore.t('vn_reader.narrator'),
            color: '#888',
            isNarrator: true,
            background: null,
        };
    });

    const backgroundImage = computed<string | null>(() => {
        if (currentSpeaker.value) {
            const ci = getCharacterInfo(currentSpeaker.value);
            if (ci?.background) return ci.background;
        }
        return currentCharacterInfo.value?.background || null;
    });

    // --- Actions ---
    function open(ssrIdParam: string, storyIndexParam: number = 0) {
        const configStore = useConfigStore();
        const cg = configStore.cgStories[ssrIdParam] as VNCGEntry | undefined;
        if (!cg) return;
        const story = cg.stories[storyIndexParam];
        if (!story) return;

        ssrId.value = ssrIdParam;
        storyIndex.value = storyIndexParam;
        lines.value = story.lines && story.lines.length
            ? story.lines
            : (story.text ? [{ speakerId: null, text: story.text }] : []);
        currentIndex.value = 0;
        autoMode.value = false;
        skipMode.value = false;
        ended.value = false;
        history.value = [];
        showingHistory.value = false;
        currentSpeaker.value = null;
        isOpen.value = true;
        showingTitle.value = true;

        globalBus.emit('vn:opened', { ssrId: ssrIdParam, storyIndex: storyIndexParam });
    }

    function close() {
        isOpen.value = false;
        autoMode.value = false;
        skipMode.value = false;
        ended.value = false;
        showingHistory.value = false;
        showingTitle.value = false;
        currentSpeaker.value = null;

        globalBus.emit('vn:closed');
    }

    function advance() {
        if (showingHistory.value) return;
        if (isTyping.value) {
            isTyping.value = false;
            return;
        }
        currentIndex.value++;
        if (currentIndex.value >= lines.value.length) {
            showEnd();
        }
    }

    function showEnd() {
        const i18nStore = useI18nStore();
        ended.value = true;
        autoMode.value = false;
        skipMode.value = false;
        history.value.push({
            speaker: i18nStore.t('vn_reader.end'),
            speakerId: null,
            text: i18nStore.t('vn_reader.chapterEnded'),
        });

        const configStore = useConfigStore();
        const cgStories = configStore.cgStories || {};
        const currentEntry = Object.values(cgStories).find(
            (entry): entry is VNCGEntry => (entry as VNCGEntry).cgId === ssrId.value
        );
        if (currentEntry && currentEntry.maleLeadId) {
            globalBus.emit('affection:vnCompleted', {
                cgId: ssrId.value,
                maleLeadId: currentEntry.maleLeadId,
                isSSR: true
            });
        }
    }

    function toggleAuto() {
        autoMode.value = !autoMode.value;
        if (autoMode.value) {
            skipMode.value = false;
        }
    }

    function toggleSkip() {
        skipMode.value = !skipMode.value;
        if (skipMode.value) {
            autoMode.value = false;
        }
    }

    function toggleHistory() {
        showingHistory.value = !showingHistory.value;
    }

    function onLineShown(line: VNLine) {
        const i18nStore = useI18nStore();
        if (line.speakerId && line.speakerId !== currentSpeaker.value) {
            currentSpeaker.value = line.speakerId;
        }
        history.value.push({
            speaker: line.speakerId ? getSpeakerDisplayName(line.speakerId) : i18nStore.t('vn_reader.narrator'),
            speakerId: line.speakerId,
            text: line.text,
        });
    }

    function getCharacterColor(speakerId: string): string {
        const ci = getCharacterInfo(speakerId);
        return ci?.color || '#888';
    }

    // --- Subscribe to events ---
    globalBus.on('cg:readRequested', (data: { cgId: string }) => {
        if (data?.cgId) {
            const configStore = useConfigStore();
            const entries = configStore.cgStories;
            for (const [key, value] of Object.entries(entries)) {
                if ((value as VNCGEntry).cgId === data.cgId) {
                    open(key, 0);
                    return;
                }
            }
        }
    });

    // --- Serialization ---
    function serialize() {
        return {
            isOpen: isOpen.value,
            ssrId: ssrId.value,
            storyIndex: storyIndex.value,
            currentIndex: currentIndex.value,
            autoMode: autoMode.value,
            skipMode: skipMode.value,
            ended: ended.value,
            showingHistory: showingHistory.value,
            currentSpeaker: currentSpeaker.value,
            history: [...history.value],
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as VNReaderSerializeData;
        ssrId.value = d.ssrId || '';
        storyIndex.value = d.storyIndex || 0;
        currentIndex.value = d.currentIndex ?? 0;
        autoMode.value = d.autoMode ?? false;
        skipMode.value = d.skipMode ?? false;
        ended.value = d.ended ?? false;
        showingHistory.value = d.showingHistory ?? false;
        currentSpeaker.value = d.currentSpeaker || null;
        history.value = d.history || [];

        if (d.ssrId && d.isOpen) {
            const configStore = useConfigStore();
            const cg = configStore.cgStories[d.ssrId] as VNCGEntry | undefined;
            if (cg) {
                const story = cg.stories[d.storyIndex || 0];
                if (story) {
                    lines.value = story.lines && story.lines.length
                        ? story.lines
                        : (story.text ? [{ speakerId: null, text: story.text }] : []);
                    isOpen.value = true;
                }
            }
        }
    }

    return {
        // State
        isOpen,
        ssrId,
        storyIndex,
        lines,
        currentIndex,
        isTyping,
        autoMode,
        skipMode,
        autoDelay,
        skipDelay,
        typingSpeed,
        history,
        showingHistory,
        currentSpeaker,
        ended,
        showingTitle,

        // Computed
        currentLine,
        currentCG,
        currentStory,
        currentCharacterInfo,
        speakerInfo,
        backgroundImage,

        // Actions
        open,
        close,
        advance,
        showEnd,
        toggleAuto,
        toggleSkip,
        toggleHistory,
        onLineShown,
        getCharacterColor,

        // Serialization
        serialize,
        deserialize,
    };
});
