"use client";
/**
 * AI Whiteboard Engine — Infinite Teaching Canvas
 *
 * THE core of the entire experience. ALL educational content lives here:
 * - Formulas, derivations, explanations, labels, notes, examples
 * - Questions, AI responses, student answers, highlights
 * - NO separate cards, popups, or panels — everything is on this board
 *
 * Behaviors:
 * - Scrolls vertically (only element that scrolls)
 * - Animated marker-style entry for each line
 * - Handwriting-style fonts for a live teaching feel
 * - Grid paper background
 * - Progressive line-by-line rendering
 */
import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { WhiteboardEntry, ActiveQuestion } from "@/store/physics.store";

// ── Style config per entry type (handwriting-first) ─────────────
const STYLES: Record<string, {
  color: string;
  fontSize: string;
  fontWeight: string | number;
  fontStyle?: string;
  lineHeight: string | number;
  paddingLeft?: string;
  borderLeft?: string;
  marginTop?: string;
  fontFamily?: string;
}> = {
  heading: {
    color: "#7dd3fc",
    fontSize: "1.6rem",
    fontWeight: 700,
    lineHeight: 1.3,
    marginTop: "1.8rem",
    fontFamily: "'Caveat', cursive",
  },
  formula: {
    color: "#f9a8d4",
    fontSize: "1.15rem",
    fontWeight: 500,
    lineHeight: 1.9,
    paddingLeft: "1.5rem",
    borderLeft: "3px solid rgba(249,168,212,0.25)",
    marginTop: "0.6rem",
    fontFamily: "'Kalam', cursive",
  },
  derivation: {
    color: "#c4b5fd",
    fontSize: "1.05rem",
    fontWeight: 400,
    lineHeight: 2,
    paddingLeft: "2rem",
    borderLeft: "2px solid rgba(196,181,253,0.15)",
    fontFamily: "'Kalam', cursive",
  },
  highlight: {
    color: "#fde68a",
    fontSize: "1.08rem",
    fontWeight: 600,
    lineHeight: 1.7,
    paddingLeft: "1.2rem",
    borderLeft: "3px solid rgba(253,230,138,0.3)",
    marginTop: "0.5rem",
    fontFamily: "'Caveat', cursive",
  },
  note: {
    color: "#94a3b8",
    fontSize: "0.92rem",
    fontWeight: 400,
    fontStyle: "italic",
    lineHeight: 1.7,
    paddingLeft: "1.5rem",
    fontFamily: "'Kalam', cursive",
  },
  arrow: {
    color: "#86efac",
    fontSize: "1rem",
    fontWeight: 400,
    lineHeight: 1.7,
    fontFamily: "'Kalam', cursive",
  },
  diagram: {
    color: "#7dd3fc",
    fontSize: "0.95rem",
    fontWeight: 400,
    lineHeight: 1.7,
    paddingLeft: "1.2rem",
    borderLeft: "2px solid rgba(125,211,252,0.2)",
    fontFamily: "'Kalam', cursive",
  },
  experiment: {
    color: "#86efac",
    fontSize: "0.95rem",
    fontWeight: 400,
    lineHeight: 1.8,
    paddingLeft: "1.2rem",
    borderLeft: "3px solid rgba(134,239,172,0.25)",
    marginTop: "0.75rem",
    fontFamily: "'Kalam', cursive",
  },
  text: {
    color: "#e0e7f0",
    fontSize: "1.02rem",
    fontWeight: 400,
    lineHeight: 1.85,
    fontFamily: "'Kalam', cursive",
  },
  speak: {
    color: "#d1d9e6",
    fontSize: "1rem",
    fontWeight: 400,
    lineHeight: 1.85,
    fontFamily: "'Kalam', cursive",
  },
  student: {
    color: "#a5b4fc",
    fontSize: "0.95rem",
    fontWeight: 500,
    lineHeight: 1.7,
    paddingLeft: "1.2rem",
    borderLeft: "2px solid rgba(165,180,252,0.3)",
    marginTop: "0.6rem",
    fontFamily: "'Inter', sans-serif",
  },
};

// ── Prefix icons per type ────────────────────────────────────────
const PREFIX: Record<string, string> = {
  heading: "",
  formula: "",
  highlight: "★  ",
  arrow: "→  ",
  diagram: "📊  ",
  experiment: "🧪  ",
  student: "🙋 You: ",
};

// ── Animation variant per entry type ─────────────────────────────
const getEntryVariants = (style: string) => {
  const base = {
    initial: { opacity: 0, x: -12, filter: "blur(3px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0 },
  };
  if (style === "heading") {
    return {
      initial: { opacity: 0, x: -16, scale: 0.97, filter: "blur(3px)" },
      animate: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
      exit: { opacity: 0 },
    };
  }
  if (style === "formula" || style === "derivation") {
    return {
      initial: { opacity: 0, x: -10, filter: "blur(2px)" },
      animate: { opacity: 1, x: 0, filter: "blur(0px)" },
      exit: { opacity: 0 },
    };
  }
  return base;
};

interface Props {
  entries: WhiteboardEntry[];
  isWriting: boolean;
  activeQuestion: ActiveQuestion | null;
  onDismissQuestion: () => void;
  onAnswerQuestion: (ans: string) => void;
}

export default function AIWhiteboard({
  entries,
  isWriting,
  activeQuestion,
  onDismissQuestion,
  onAnswerQuestion,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [openAnswer, setOpenAnswer] = useState("");
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizRevealed, setQuizRevealed] = useState(false);

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length, isWriting, activeQuestion]);

  // Voice Engine (TTS) - Disabled for now as per user request
  const spokenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    // Disabled: Voice sounds weird and lacks proper Indian accent
    /*
    const latest = entries[entries.length - 1];
    if (latest && (latest.style === "speak" || latest.style === "text")) {
      if (!spokenRef.current.has(latest.id)) {
        spokenRef.current.add(latest.id);
        if ("speechSynthesis" in window) {
          const cleanText = latest.content.replace(/[*#_`]/g, "").replace(/\$/g, "");
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.rate = 1.05;
          utterance.pitch = 1.1;
          
          const voices = window.speechSynthesis.getVoices();
          const femaleVoice = voices.find(v => v.name.includes("Female") || v.name.includes("Google UK English Female") || v.name.includes("Zira"));
          if (femaleVoice) utterance.voice = femaleVoice;
          
          window.speechSynthesis.speak(utterance);
        }
      }
    }
    */
  }, [entries]);

  // Reset quiz state when question changes
  useEffect(() => {
    const id = window.setTimeout(() => {
      setQuizSelected(null);
      setQuizRevealed(false);
      setOpenAnswer("");
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeQuestion?.question]);

  const handleQuizSelect = (i: number) => {
    if (quizRevealed) return;
    setQuizSelected(i);
    setQuizRevealed(true);
  };

  const handleContinue = () => {
    setOpenAnswer("");
    setQuizSelected(null);
    setQuizRevealed(false);
    onDismissQuestion();
  };

  // Memoize the marker dots (heading indicators)
  const markerEntries = useMemo(() => {
    return new Set(
      entries
        .filter((e, i) => i === 0 || e.style === "heading")
        .map((e) => e.id)
    );
  }, [entries]);

  return (
    <div
      id="ai-whiteboard"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        height: "100%",
        background: "var(--c-whiteboard-bg)",
      }}
    >
      {/* ═══ GRID PAPER BACKGROUND ═══ */}
      <div
        className="whiteboard-grid"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Left margin line (like real notebook) */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 0,
          bottom: 0,
          width: 1,
          background: "rgba(244,114,182,0.06)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* ═══ SCROLLABLE WHITEBOARD CONTENT ═══ */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "32px 40px 80px 56px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(99,102,241,0.18) transparent",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* ── EMPTY STATE ── */}
        {entries.length === 0 && !isWriting && !activeQuestion && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              gap: 20,
              opacity: 0.2,
            }}
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ fontSize: 56 }}
            >
              📐
            </motion.div>
            <span
              style={{
                color: "#64748b",
                fontSize: 15,
                fontFamily: "var(--font-handwriting)",
                letterSpacing: "0.02em",
              }}
            >
              Choose a topic — NOVA will teach here on this board
            </span>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 8,
              }}
            >
              {["✍️ Formulas", "📊 Diagrams", "🧪 Experiments", "🧠 Quizzes"].map((item) => (
                <span
                  key={item}
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 20,
                    background: "rgba(99,102,241,0.06)",
                    border: "1px solid rgba(99,102,241,0.1)",
                    color: "rgba(99,102,241,0.3)",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ═══ WHITEBOARD ENTRIES ═══ */}
        <AnimatePresence initial={false}>
          {entries.map((entry) => {
            const s = STYLES[entry.style] || STYLES.text;
            const prefix = PREFIX[entry.style] || "";
            const variants = getEntryVariants(entry.style);
            const hasMarker = markerEntries.has(entry.id);

            return (
              <motion.div
                key={entry.id}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{
                  duration: entry.style === "heading" ? 0.5 : 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                style={{
                  color: s.color,
                  fontSize: s.fontSize,
                  fontWeight: s.fontWeight,
                  fontStyle: s.fontStyle,
                  lineHeight: s.lineHeight,
                  fontFamily: s.fontFamily || "var(--font-handwriting-alt)",
                  paddingLeft: s.paddingLeft,
                  borderLeft: s.borderLeft,
                  marginTop: s.marginTop || "0.15rem",
                  marginBottom: "0.25rem",
                  position: "relative",
                }}
              >
                {/* Marker dot for headings / first entry */}
                {hasMarker && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.7 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                    style={{
                      position: "absolute",
                      left: s.paddingLeft ? -8 : -20,
                      top: "0.5em",
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: s.color,
                      boxShadow: `0 0 8px ${s.color}40`,
                    }}
                  />
                )}

                {/* Content rendered with markdown + KaTeX */}
                <div className="whiteboard-content" style={{ color: s.color }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({ children }) => (
                        <p style={{ margin: "0.15rem 0" }}>{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong
                          style={{
                            color: "var(--c-chalk-yellow)",
                            fontWeight: 700,
                            textShadow: "0 0 6px rgba(253,224,71,0.12)",
                          }}
                        >
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em style={{ color: "#94a3b8" }}>{children}</em>
                      ),
                      code: ({ children }) => (
                        <code
                          style={{
                            background: "rgba(99,102,241,0.1)",
                            padding: "0.12em 0.45em",
                            borderRadius: 5,
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.85em",
                            color: "var(--c-chalk-blue)",
                          }}
                        >
                          {children}
                        </code>
                      ),
                      h1: ({ children }) => (
                        <h1
                          style={{
                            fontFamily: "var(--font-handwriting)",
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            color: "var(--c-chalk-blue)",
                            marginBottom: "0.4rem",
                          }}
                        >
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2
                          style={{
                            fontFamily: "var(--font-handwriting)",
                            fontSize: "1.3rem",
                            fontWeight: 600,
                            color: "var(--c-chalk-blue)",
                            marginBottom: "0.3rem",
                          }}
                        >
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3
                          style={{
                            fontFamily: "var(--font-handwriting)",
                            fontSize: "1.15rem",
                            fontWeight: 600,
                            color: "var(--c-chalk-purple)",
                            marginBottom: "0.2rem",
                          }}
                        >
                          {children}
                        </h3>
                      ),
                      ul: ({ children }) => (
                        <ul style={{ margin: "0.3rem 0", paddingLeft: "1.2rem" }}>{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol style={{ margin: "0.3rem 0", paddingLeft: "1.2rem" }}>{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li style={{ marginBottom: "0.15rem" }}>{children}</li>
                      ),
                    }}
                  >
                    {prefix + entry.content}
                  </ReactMarkdown>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* ═══ WRITING INDICATOR ═══ */}
        <AnimatePresence>
          {isWriting && (
            <motion.div
              key="writing-indicator"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 18,
                paddingLeft: 4,
              }}
            >
              {/* Animated pen */}
              <motion.span
                animate={{ rotate: [-5, 5, -5], x: [0, 3, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ fontSize: 16, display: "inline-block" }}
              >
                ✏️
              </motion.span>

              {/* Bouncing dots */}
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    style={{
                      display: "inline-block",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#6366f1",
                    }}
                    animate={{ opacity: [0.2, 1, 0.2], y: [0, -5, 0] }}
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>

              <span
                style={{
                  color: "rgba(99,102,241,0.5)",
                  fontSize: 12,
                  fontFamily: "var(--font-handwriting)",
                  letterSpacing: "0.03em",
                }}
              >
                NOVA is writing on the board…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ INLINE QUESTION / QUIZ (on the whiteboard!) ═══ */}
        <AnimatePresence>
          {activeQuestion && (
            <motion.div
              key="question-block"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              style={{
                marginTop: 28,
                padding: "22px 26px",
                borderRadius: 14,
                background: "rgba(253,224,71,0.04)",
                border: "1px solid rgba(253,224,71,0.12)",
                position: "relative",
              }}
            >
              {/* Chalk-style corner decoration */}
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 12,
                  width: 24,
                  height: 24,
                  borderRight: "2px solid rgba(253,224,71,0.15)",
                  borderTop: "2px solid rgba(253,224,71,0.15)",
                  borderRadius: "0 6px 0 0",
                }}
              />

              {/* Label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 18 }}>
                  {activeQuestion.isQuiz ? "🧠" : "🤔"}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#fde68a",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  {activeQuestion.isQuiz ? "Quick Quiz" : "Check Understanding"}
                </span>
              </div>

              {/* Question text — on the whiteboard, handwriting style */}
              <p
                style={{
                  color: "#fef3c7",
                  fontSize: "1.12rem",
                  lineHeight: 1.7,
                  marginBottom: 18,
                  fontWeight: 500,
                  fontFamily: "var(--font-handwriting)",
                }}
              >
                {activeQuestion.question}
              </p>

              {/* Hint */}
              {activeQuestion.hint && (
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "0.88rem",
                    marginBottom: 14,
                    fontStyle: "italic",
                    fontFamily: "var(--font-handwriting-alt)",
                  }}
                >
                  💡 {activeQuestion.hint}
                </p>
              )}

              {/* Quiz options */}
              {activeQuestion.isQuiz && activeQuestion.options && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {activeQuestion.options.map((opt, i) => {
                    const isCorrect = i === activeQuestion.correct;
                    const isSelected = i === quizSelected;
                    let bg = "rgba(255,255,255,0.03)";
                    let border = "rgba(255,255,255,0.08)";
                    let color = "#cbd5e1";
                    if (quizRevealed) {
                      if (isCorrect) {
                        bg = "rgba(134,239,172,0.08)";
                        border = "#86efac";
                        color = "#86efac";
                      } else if (isSelected) {
                        bg = "rgba(248,113,113,0.08)";
                        border = "#f87171";
                        color = "#f87171";
                      }
                    }
                    return (
                      <motion.button
                        key={i}
                        whileHover={!quizRevealed ? { scale: 1.02 } : undefined}
                        whileTap={!quizRevealed ? { scale: 0.98 } : undefined}
                        onClick={() => handleQuizSelect(i)}
                        style={{
                          textAlign: "left",
                          padding: "11px 16px",
                          borderRadius: 10,
                          background: bg,
                          border: `1px solid ${border}`,
                          color,
                          fontSize: "0.9rem",
                          fontFamily: "var(--font-handwriting-alt)",
                          cursor: quizRevealed ? "default" : "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        <span style={{ opacity: 0.45, fontFamily: "var(--font-ui)", fontSize: "0.8rem" }}>
                          {["A", "B", "C", "D"][i]}.{" "}
                        </span>
                        {opt}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Quiz explanation after reveal */}
              {quizRevealed && activeQuestion.explanation && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(134,239,172,0.05)",
                    border: "1px solid rgba(134,239,172,0.12)",
                    color: "#86efac",
                    fontSize: "0.9rem",
                    marginBottom: 14,
                    lineHeight: 1.7,
                    fontFamily: "var(--font-handwriting-alt)",
                  }}
                >
                  ✅ {activeQuestion.explanation}
                </motion.div>
              )}

              {/* Open answer input (Removed, using main chat instead) */}
              {!activeQuestion.isQuiz && (
                <div style={{ marginBottom: 16 }}>
                  <p
                    style={{
                      color: "rgba(253,224,71,0.6)",
                      fontSize: "0.88rem",
                      fontStyle: "italic",
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    (Type your answer in the main chat box below, or click Continue to skip)
                  </p>
                </div>
              )}

              {/* Continue */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleContinue}
                  style={{
                    padding: "9px 22px",
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "#fff",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    boxShadow: "0 0 20px rgba(99,102,241,0.25)",
                  }}
                >
                  Continue →
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={bottomRef} style={{ height: 32 }} />
      </div>
    </div>
  );
}
