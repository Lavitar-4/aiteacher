import { create } from "zustand";

export type AppMode = "home" | "loading" | "classroom";
export type Language = "auto" | "en" | "hi" | "hinglish";
export type Level = "auto" | "beginner" | "intermediate" | "advanced";

export interface TeachingStep {
  type: "write" | "speak" | "animate" | "draw" | "ask" | "quiz" | "pause" | "experiment";
  style?: string;
  content?: string;
  animation_type?: string;
  params?: Record<string, unknown>;
  caption?: string;
  instruction?: string;
  data?: Record<string, unknown>;
  question?: string;
  options?: string[];
  correct?: number;
  explanation?: string;
  hint?: string;
  expected?: string;
  name?: string;
  setup?: string;
  steps?: string[];
  expected_observation?: string;
  message?: string;
  duration?: number;
}

export interface WhiteboardEntry {
  id: string;
  type: TeachingStep["type"];
  style: string;
  content: string;
  timestamp: number;
}

export interface SliderConfig {
  name: string;
  min: number;
  max: number;
  val: number;
}

export interface ActiveAnimation {
  type: string;
  params: Record<string, unknown> & { sliders?: SliderConfig[] };
  caption: string;
}

export interface ActiveQuestion {
  question: string;
  hint?: string;
  expected?: string;
  options?: string[];
  correct?: number;
  explanation?: string;
  isQuiz: boolean;
}

interface Store {
  // Mode
  mode: AppMode;
  setMode: (m: AppMode) => void;

  // Session
  sessionId: string;
  topic: string;
  level: Level;
  language: Language;
  setTopic: (t: string) => void;
  setLevel: (l: Level) => void;
  setLanguage: (l: Language) => void;

  // Steps queue
  steps: TeachingStep[];
  stepIndex: number;
  isPlaying: boolean;
  setSteps: (steps: TeachingStep[]) => void;
  appendSteps: (steps: TeachingStep[]) => void;
  advanceStep: () => void;
  setStepIndex: (i: number) => void;
  setIsPlaying: (v: boolean) => void;

  // Whiteboard
  whiteboardEntries: WhiteboardEntry[];
  addEntry: (e: Omit<WhiteboardEntry, "id" | "timestamp">) => void;
  clearWhiteboard: () => void;

  // Animation
  activeAnimation: ActiveAnimation | null;
  sliderValues: Record<string, number>;
  setAnimation: (a: ActiveAnimation | null) => void;
  setSliderValue: (name: string, val: number) => void;

  // Question / Quiz
  activeQuestion: ActiveQuestion | null;
  setQuestion: (q: ActiveQuestion | null) => void;

  // AI state
  isAIThinking: boolean;
  setAIThinking: (v: boolean) => void;
  aiStatus: string;
  setAIStatus: (s: string) => void;

  // Controls
  slowMode: boolean;
  animationEnabled: boolean;
  toggleSlowMode: () => void;
  toggleAnimation: () => void;

  // Backend
  backendOnline: boolean;
  setBackendOnline: (v: boolean) => void;
  modelReady: boolean;
  setModelReady: (v: boolean) => void;

  // Reset
  startLesson: (topic: string, level: Level) => void;
  reset: () => void;
}

let _id = 0;
const uid = () => `${Date.now()}-${_id++}`;

export const useStore = create<Store>((set, get) => ({
  mode: "home",
  setMode: (m) => set({ mode: m }),

  sessionId: "default",
  topic: "",
  level: "auto",
  language: "auto",
  setTopic: (t) => set({ topic: t }),
  setLevel: (l) => set({ level: l }),
  setLanguage: (l) => set({ language: l }),

  steps: [],
  stepIndex: 0,
  isPlaying: false,
  setSteps: (steps) => set({ steps, stepIndex: 0, isPlaying: true }),
  appendSteps: (steps) => set((s) => ({ steps: [...s.steps, ...steps] })),
  advanceStep: () => {
    const { stepIndex, steps } = get();
    const next = stepIndex + 1;
    set({ stepIndex: next, isPlaying: next < steps.length });
  },
  setStepIndex: (i) => set({ stepIndex: i }),
  setIsPlaying: (v) => set({ isPlaying: v }),

  whiteboardEntries: [],
  addEntry: (e) =>
    set((s) => ({
      whiteboardEntries: (() => {
        const now = Date.now();
        const last = s.whiteboardEntries[s.whiteboardEntries.length - 1];
        if (
          last &&
          last.type === e.type &&
          last.style === e.style &&
          last.content === e.content &&
          now - last.timestamp < 1500
        ) {
          return s.whiteboardEntries;
        }
        return [...s.whiteboardEntries, { ...e, id: uid(), timestamp: now }];
      })(),
    })),
  clearWhiteboard: () => set({ whiteboardEntries: [] }),

  activeAnimation: null,
  sliderValues: {},
  setAnimation: (a) => {
    // Initialize default slider values when a new animation is set
    const initVals: Record<string, number> = {};
    if (a?.params?.sliders) {
      for (const s of a.params.sliders) {
        initVals[s.name] = s.val;
      }
    }
    set({ activeAnimation: a, sliderValues: initVals });
  },
  setSliderValue: (name, val) => set((s) => ({ sliderValues: { ...s.sliderValues, [name]: val } })),

  activeQuestion: null,
  setQuestion: (q) => set({ activeQuestion: q }),

  isAIThinking: false,
  setAIThinking: (v) => set({ isAIThinking: v }),
  aiStatus: "idle",
  setAIStatus: (s) => set({ aiStatus: s }),

  slowMode: false,
  animationEnabled: true,
  toggleSlowMode: () => set((s) => ({ slowMode: !s.slowMode })),
  toggleAnimation: () => set((s) => ({ animationEnabled: !s.animationEnabled })),

  backendOnline: false,
  setBackendOnline: (v) => set({ backendOnline: v }),
  modelReady: false,
  setModelReady: (v) => set({ modelReady: v }),

  startLesson: (topic, level) => {
    set({
      mode: "loading",
      topic,
      level,
      steps: [],
      stepIndex: 0,
      isPlaying: false,
      whiteboardEntries: [],
      activeAnimation: null,
      sliderValues: {},
      activeQuestion: null,
    });
  },

  reset: () =>
    set({
      mode: "home",
      topic: "",
      steps: [],
      stepIndex: 0,
      isPlaying: false,
      whiteboardEntries: [],
      activeAnimation: null,
      sliderValues: {},
      activeQuestion: null,
      isAIThinking: false,
      aiStatus: "idle",
    }),
}));
