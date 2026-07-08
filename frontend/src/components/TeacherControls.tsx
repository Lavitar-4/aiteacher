"use client";
/**
 * Bottom Bar — Fixed at bottom, always visible.
 *
 * Contains:
 * - Playback controls (play/pause, replay, slow, animation toggle)
 * - Quick command chips
 * - Microphone button
 * - Text input with auto-resize
 * - Send button
 * - Progress bar
 *
 * Student messages get written to the whiteboard via onSend.
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/physics.store";

interface Props {
  onSend: (msg: string, image: string | null) => void;
  onQuiz: () => void;
  onExperiment: () => void;
  onContinue: () => void;
}

const QUICK_CMDS = [
  { label: "Explain again", icon: "🔁" },
  { label: "Show animation", icon: "🎬" },
  { label: "Give an example", icon: "💡" },
  { label: "Slow down", icon: "🐢" },
  { label: "Draw a diagram", icon: "📐" },
  { label: "What's next?", icon: "➡" },
  { label: "मुझे हिंदी में समझाओ", icon: "🇮🇳" },
  { label: "Dobara samjhao", icon: "🔄" },
];

const TEST_PROMPTS = [
  { label: "Projectile", msg: "Show the projectile motion animation and explain the trajectory." },
  { label: "Pendulum", msg: "Show a pendulum animation and explain why it swings." },
  { label: "Electric", msg: "Show electric field lines between positive and negative charges." },
  { label: "Black hole", msg: "Show a black hole animation and explain the event horizon." },
  { label: "Supernova", msg: "What if a supernova blast happens? Show the animation." },
];

export default function BottomBar({
  onSend,
  onQuiz,
  onExperiment,
  onContinue,
}: Props) {
  const {
    isPlaying, isAIThinking, slowMode, animationEnabled,
    steps, stepIndex,
    setIsPlaying, toggleSlowMode, toggleAnimation,
    clearWhiteboard, setStepIndex,
  } = useStore();

  const [input, setInput] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 96) + "px";
    }
  }, [input]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setSelectedImage(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const send = () => {
    const msg = input.trim();
    if (!msg && !selectedImage) return;
    onSend(msg || "What is in this image?", selectedImage);
    setInput("");
    setSelectedImage(null);
    setShowQuick(false);
  };

  const isEnd = stepIndex >= steps.length - 1;
  const progress =
    steps.length > 0 ? ((stepIndex + 1) / steps.length) * 100 : 0;

  return (
    <div className="bottombar-glass">
      {/* ═══ PROGRESS BAR ═══ */}
      {steps.length > 0 && (
        <div
          style={{
            height: 2,
            background: "rgba(99,102,241,0.08)",
            overflow: "hidden",
          }}
        >
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              height: "100%",
              background:
                "linear-gradient(90deg, #6366f1, #a78bfa, #e879f9)",
              borderRadius: "0 2px 2px 0",
            }}
          />
        </div>
      )}

      {/* ═══ QUICK COMMANDS DRAWER ═══ */}
      <AnimatePresence>
        {showQuick && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              overflow: "hidden",
              borderBottom: "1px solid rgba(99,102,241,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                padding: "10px 16px",
              }}
            >
              {QUICK_CMDS.map((c) => (
                <motion.button
                  key={c.label}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setInput(c.label);
                    setShowQuick(false);
                    textRef.current?.focus();
                  }}
                  style={{
                    fontSize: 11,
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: "rgba(99,102,241,0.07)",
                    border: "1px solid rgba(99,102,241,0.15)",
                    color: "#a5b4fc",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontFamily: "'Kalam', cursive",
                  }}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "0 16px 8px",
        }}
      >
        <span style={{ fontSize: 10, color: "#64748b", alignSelf: "center" }}>
          Animation tests:
        </span>
        {TEST_PROMPTS.map((item) => (
          <motion.button
            key={item.label}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSend(item.msg, null)}
            style={{
              fontSize: 11,
              padding: "6px 12px",
              borderRadius: 18,
              background: "rgba(129,140,248,0.08)",
              border: "1px solid rgba(129,140,248,0.16)",
              color: "#c7d2fe",
              cursor: "pointer",
              fontFamily: "'Kalam', cursive",
            }}
          >
            {item.label}
          </motion.button>
        ))}
      </div>

      {/* ═══ MAIN INPUT ROW ═══ */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          padding: "10px 14px 10px",
        }}
      >
        {/* ── Playback Controls ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexShrink: 0,
          }}
        >
          <ControlBtn
            icon={isPlaying ? "⏸" : "▶"}
            label={isPlaying ? "Pause" : "Play"}
            active={isPlaying}
            onClick={() => setIsPlaying(!isPlaying)}
          />
          <ControlBtn
            icon="🔁"
            label="Replay"
            onClick={() => {
              clearWhiteboard();
              setStepIndex(0);
              setIsPlaying(true);
            }}
          />
          <ControlBtn
            icon="🐢"
            label="Slow"
            active={slowMode}
            onClick={toggleSlowMode}
          />
          <ControlBtn
            icon="🎬"
            label="Anim"
            active={animationEnabled}
            onClick={toggleAnimation}
          />
          <ControlBtn icon="📝" label="Quiz" onClick={onQuiz} />
          <ControlBtn icon="🧪" label="Lab" onClick={onExperiment} />
          {isEnd && (
            <ControlBtn icon="➡" label="More" onClick={onContinue} />
          )}
        </div>

        {/* Separator */}
        <div
          style={{
            width: 1,
            height: 26,
            background: "rgba(99,102,241,0.1)",
            flexShrink: 0,
            alignSelf: "center",
          }}
        />

        {/* Quick toggle */}
        <button
          onClick={() => setShowQuick(!showQuick)}
          className="btn-subtle"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: showQuick
              ? "rgba(99,102,241,0.15)"
              : "rgba(99,102,241,0.05)",
            border: `1px solid ${
              showQuick
                ? "rgba(99,102,241,0.3)"
                : "rgba(99,102,241,0.12)"
            }`,
            color: "#a5b4fc",
            fontSize: 14,
            cursor: "pointer",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "flex-end",
          }}
          title="Quick commands"
        >
          ⚡
        </button>

        {/* Attachment */}
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: "none" }} 
          onChange={handleFile} 
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-subtle"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: selectedImage
              ? "rgba(167,139,250,0.15)"
              : "rgba(99,102,241,0.05)",
            border: `1px solid ${
              selectedImage
                ? "rgba(167,139,250,0.3)"
                : "rgba(99,102,241,0.12)"
            }`,
            color: selectedImage ? "#a78bfa" : "#475569",
            fontSize: 13,
            cursor: "pointer",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "flex-end",
          }}
          title={selectedImage ? "Image selected" : "Attach Image"}
        >
          📎
        </button>

        {/* Mic */}
        <button
          onClick={() => setIsMicOn(!isMicOn)}
          className="btn-subtle"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: isMicOn
              ? "rgba(248,113,113,0.12)"
              : "rgba(99,102,241,0.05)",
            border: `1px solid ${
              isMicOn
                ? "rgba(248,113,113,0.25)"
                : "rgba(99,102,241,0.12)"
            }`,
            color: isMicOn ? "#f87171" : "#475569",
            fontSize: 13,
            cursor: "pointer",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "flex-end",
          }}
          title="Microphone"
        >
          🎤
        </button>

        {/* Text Input */}
        <textarea
          ref={textRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={isAIThinking ? "NOVA is working… you can still ask!" : "Ask NOVA anything…"}
          className="input-glow"
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(99,102,241,0.12)",
            borderRadius: 10,
            padding: "9px 14px",
            color: "#e2e8f0",
            fontSize: 13,
            lineHeight: 1.5,
            resize: "none",
            outline: "none",
            caretColor: "#6366f1",
            minHeight: 36,
            fontFamily: "'Inter', sans-serif",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        />

        {/* Send */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={send}
          disabled={!input.trim()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background:
              input.trim()
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.2)",
            cursor:
              input.trim() ? "pointer" : "default",
            opacity: input.trim() ? 1 : 0.35,
            boxShadow:
              input.trim()
                ? "0 0 20px rgba(99,102,241,0.3)"
                : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            alignSelf: "flex-end",
            transition: "all 0.2s",
          }}
        >
          {isAIThinking ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "2px solid transparent",
                borderTopColor: "#a5b4fc",
              }}
            />
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </motion.button>
      </div>
    </div>
  );
}

// ── Control button helper ────────────────────────────────────────
function ControlBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="btn-subtle"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        padding: "5px 7px",
        borderRadius: 8,
        background: active
          ? "rgba(99,102,241,0.15)"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${
          active
            ? "rgba(99,102,241,0.3)"
            : "rgba(255,255,255,0.05)"
        }`,
        color: active ? "#a5b4fc" : "#3f4c5e",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>
      <span
        style={{
          fontSize: 7,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </button>
  );
}
