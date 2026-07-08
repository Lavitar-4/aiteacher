import axios from "axios";
import { TeachingStep } from "@/store/physics.store";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const http = axios.create({ baseURL: BASE, timeout: 300000 });

export const api = {
  health: () => http.get("/api/v1/health").then((r) => r.data),
  checkModel: () => http.get("/api/v1/model/check").then((r) => r.data),
  getTopics: () => http.get("/api/v1/topics").then((r) => r.data),

  teach: (topic: string, studentMessage = "", sessionId = "default") =>
    http.post<{ steps: TeachingStep[] }>("/api/v1/teach", {
      topic, student_message: studentMessage, session_id: sessionId,
    }).then((r) => r.data),

  ask: (message: string, sessionId = "default") =>
    http.post<{ steps: TeachingStep[] }>("/api/v1/ask", {
      message, session_id: sessionId,
    }).then((r) => r.data),

  continueLesson: (sessionId = "default") =>
    http.post<{ steps: TeachingStep[] }>(`/api/v1/continue?session_id=${sessionId}`).then((r) => r.data),

  quiz: (sessionId = "default", topic = "") =>
    http.post<{ steps: TeachingStep[] }>(`/api/v1/quiz?session_id=${sessionId}&topic=${encodeURIComponent(topic)}`).then((r) => r.data),

  experiment: (sessionId = "default", concept = "") =>
    http.post<{ steps: TeachingStep[] }>(`/api/v1/experiment?session_id=${sessionId}&concept=${encodeURIComponent(concept)}`).then((r) => r.data),

  setPrefs: (sessionId: string, prefs: Record<string, unknown>) =>
    http.post("/api/v1/prefs", { session_id: sessionId, ...prefs }),

  getMemory: (sessionId = "default") =>
    http.get(`/api/v1/memory/${sessionId}`).then((r) => r.data),

  resetSession: (sessionId = "default") =>
    http.delete(`/api/v1/session/${sessionId}`),

  fixCode: async (code: string, error: string, sessionId = "default") => {
    const res = await fetch(`${BASE}/api/v1/critic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, error, session_id: sessionId }),
    });
    if (!res.ok) throw new Error("Critic API error");
    return res.json() as Promise<{ fixed_code: string }>;
  },

  generateAnimationCode: async (topic: string, caption: string, sessionId = "default") => {
    const res = await fetch(`${BASE}/api/v1/animate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, caption, session_id: sessionId }),
    });
    if (!res.ok) throw new Error("Animator API error");
    return res.json() as Promise<{ code: string }>;
  },

  /** POST body SSE — fetch-based for streaming */
  streamTeach: async (
    topic: string,
    studentMessage: string,
    sessionId: string,
    onChunk: (chunk: string) => void,
    onStep: (step: TeachingStep) => void,
    onDone: (steps: TeachingStep[]) => void,
    signal?: AbortSignal,
  ) => {
    const res = await fetch(`${BASE}/api/v1/teach/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, student_message: studentMessage, session_id: sessionId }),
      signal,
    });
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop()!;
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6);
        try {
          const parsed = JSON.parse(raw);
          if (parsed.done) { onDone(parsed.steps || []); }
          else if (parsed.step) { onStep(parsed.step); }
          else if (parsed.chunk) { onChunk(parsed.chunk); }
        } catch { /* ignore */ }
      }
    }
  },

  streamAsk: async (
    message: string,
    sessionId: string,
    image: string | null,
    onChunk: (chunk: string) => void,
    onStep: (step: TeachingStep) => void,
    onDone: (steps: TeachingStep[]) => void,
    signal?: AbortSignal,
  ) => {
    const res = await fetch(`${BASE}/api/v1/ask/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, image, session_id: sessionId }),
      signal,
    });
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop()!;
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.done) { onDone(parsed.steps || []); }
          else if (parsed.step) { onStep(parsed.step); }
          else if (parsed.chunk) { onChunk(parsed.chunk); }
        } catch { /* ignore */ }
      }
    }
  },
};
