"use client";
/**
 * NOVA Fullscreen AI Classroom — Whiteboard First Layout
 *
 * STRICT LAYOUT (nothing else should deviate from this):
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  TOPBAR (fixed height, minimal, glassmorphic)            │
 *   ├─────────────────────────────────┬────────────────────────┤
 *   │                                 │                        │
 *   │  AI WHITEBOARD (MAIN)           │  SIMULATION PANEL      │
 *   │  • flex-1, scrolls ONLY here    │  • fixed 380px width   │
 *   │  • ALL text/formulas/Q&A here   │  • NEVER scrolls       │
 *   │  • infinite vertical canvas     │  • always visible      │
 *   │  • grid paper background        │  • canvas + controls   │
 *   │                                 │                        │
 *   ├─────────────────────────────────┴────────────────────────┤
 *   │  BOTTOM BAR (fixed: input + mic + send + playback)       │
 *   └──────────────────────────────────────────────────────────┘
 *
 * SCROLL RULES:
 *   - ONLY the whiteboard area scrolls vertically
 *   - Simulation panel: fixed, no scroll
 *   - Bottom bar: fixed, always visible
 *   - Top bar: fixed, always visible
 *   - NO horizontal scroll anywhere
 */
import { useStore } from "@/store/physics.store";
import { useOrchestrator } from "@/hooks/useTeacher";
import AIWhiteboard from "@/components/Whiteboard";
import SimulationPanel from "@/components/AnimationPanel";
import BottomBar from "@/components/TeacherControls";

export default function Classroom() {
  const {
    topic, level, aiStatus, isAIThinking,
    whiteboardEntries, activeAnimation, activeQuestion,
    backendOnline, modelReady, reset,
  } = useStore();

  const { sendMessage, dismissQuestion, continueLesson, requestQuiz, requestExperiment } =
    useOrchestrator();

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#050810",
      }}
    >
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ═══ TOPBAR — Minimal, glassmorphic, always visible  ═══ */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header
        className="topbar-glass"
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "7px 18px",
          zIndex: 20,
          minHeight: 42,
        }}
      >
        {/* Logo */}
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚛️</span>
        <span
          style={{
            fontWeight: 700,
            fontSize: 12,
            background: "linear-gradient(135deg, #818cf8, #e879f9)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "0.06em",
            flexShrink: 0,
          }}
        >
          NOVA
        </span>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 14,
            background: "rgba(99,102,241,0.15)",
            flexShrink: 0,
          }}
        />

        {/* Topic */}
        <span
          style={{
            color: "#a5b4fc",
            fontSize: 12,
            fontWeight: 500,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "'Caveat', cursive",
            letterSpacing: "0.02em",
          }}
        >
          {topic}
        </span>

        {/* Level badge */}
        <span
          style={{
            fontSize: 9,
            padding: "2px 8px",
            borderRadius: 20,
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.15)",
            color: "#818cf8",
            flexShrink: 0,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 600,
          }}
        >
          {level === "auto" ? "Adaptive" : level}
        </span>

        {/* AI thinking dots */}
        {isAIThinking && (
          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "#818cf8",
                  animation: `bounce 0.9s ${i * 0.22}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        {/* Status */}
        <span
          style={{
            fontSize: 10,
            color: isAIThinking ? "#a78bfa" : "#334155",
            flexShrink: 0,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {aiStatus}
        </span>

        {/* Status dots */}
        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div
            title={backendOnline ? "Backend online" : "Backend offline"}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: backendOnline ? "#4ade80" : "#f87171",
              boxShadow: backendOnline ? "0 0 6px #4ade8080" : "none",
            }}
          />
          <div
            title={modelReady ? "Model ready" : "Model loading"}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: modelReady ? "#4ade80" : "#fbbf24",
              boxShadow: modelReady ? "0 0 6px #4ade8080" : "none",
            }}
          />
        </div>

        {/* Exit */}
        <button
          onClick={reset}
          className="btn-subtle"
          style={{
            fontSize: 10,
            padding: "3px 10px",
            borderRadius: 8,
            border: "1px solid rgba(248,113,113,0.15)",
            color: "#f87171",
            background: "transparent",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ✕ Exit
        </button>
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ═══ MAIN CONTENT AREA                                 ═══ */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* ── LEFT: AI WHITEBOARD (ONLY this scrolls) ─────────── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <AIWhiteboard
            entries={whiteboardEntries}
            isWriting={isAIThinking}
            activeQuestion={activeQuestion}
            onDismissQuestion={dismissQuestion}
            onAnswerQuestion={(ans) => sendMessage(`My answer: ${ans}`)}
          />
        </div>

        {/* ── RIGHT: SIMULATION PANEL (fixed, never scrolls) ──── */}
        <div
          className="sim-panel-border"
          style={{
            width: 380,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <SimulationPanel animation={activeAnimation} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ═══ BOTTOM BAR (fixed, always visible)                ═══ */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0 }}>
        <BottomBar
          onSend={sendMessage}
          onQuiz={requestQuiz}
          onExperiment={requestExperiment}
          onContinue={continueLesson}
        />
      </div>
    </div>
  );
}
