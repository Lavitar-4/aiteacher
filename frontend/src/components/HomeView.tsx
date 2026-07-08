"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useStore, Level, Language } from "@/store/physics.store";
import { api } from "@/lib/api";

const LEVEL_OPTS: { id: Level; icon: string; label: string; desc: string }[] = [
  { id: "auto", icon: "✨", label: "Adaptive", desc: "AI adjusts to you" },
  { id: "beginner", icon: "🌱", label: "Beginner", desc: "Start from scratch" },
  { id: "intermediate", icon: "⚡", label: "Intermediate", desc: "Build deeper" },
  { id: "advanced", icon: "🚀", label: "Advanced", desc: "Full rigor + math" },
];

const LANG_OPTS: { id: Language; flag: string; label: string }[] = [
  { id: "auto", flag: "🌐", label: "Auto" },
  { id: "en", flag: "🇬🇧", label: "English" },
  { id: "hi", flag: "🇮🇳", label: "हिंदी" },
  { id: "hinglish", flag: "🤝", label: "Hinglish" },
];

export default function HomeView() {
  const { startLesson, level, setLevel, language, setLanguage } = useStore();
  const [topics, setTopics] = useState<Record<string, string[]>>({});
  const [custom, setCustom] = useState("");

  useEffect(() => {
    api.getTopics().then(setTopics).catch(() => {
      setTopics({
        beginner: ["Motion and Kinematics", "Newton's Laws", "Energy", "Gravity", "Waves"],
        intermediate: ["Rotational Mechanics", "Thermodynamics", "Electromagnetism"],
        advanced: ["Special Relativity", "Quantum Mechanics", "Particle Physics"],
      });
    });
  }, []);

  const go = (topic: string) => {
    if (!topic.trim()) return;
    api.setPrefs("default", { language, level }).catch(() => {});
    startLesson(topic.trim(), level);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
        padding: "48px 24px 24px",
        gap: 36,
        overflowY: "auto",
        scrollbarWidth: "none",
      }}
    >
      {/* ═══ HERO ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          maxWidth: 640,
        }}
      >
        {/* Atom icon */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ fontSize: 72 }}
        >
          ⚛️
        </motion.div>

        <div>
          <h1
            style={{
              fontSize: "3.2rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: 8,
              background:
                "linear-gradient(135deg, #818cf8 0%, #e879f9 40%, #38bdf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            NOVA Physics
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#3b4763",
              fontFamily: "'Caveat', cursive",
              letterSpacing: "0.03em",
            }}
          >
            Your infinite AI Physics Teacher — from F=ma to quantum field
            theory
          </p>
        </div>

        {/* Feature tags */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
          }}
        >
          {[
            "✍️ AI Whiteboard",
            "🎬 Live Simulations",
            "🧪 Experiments",
            "🇮🇳 Hindi / Hinglish",
            "💬 Ask Anything",
            "⚡ Adaptive Pace",
          ].map((f) => (
            <span
              key={f}
              style={{
                fontSize: 11,
                padding: "5px 14px",
                borderRadius: 20,
                background: "rgba(99,102,241,0.06)",
                border: "1px solid rgba(99,102,241,0.12)",
                color: "#818cf8",
                fontWeight: 500,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </motion.div>

      {/* ═══ SETTINGS ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          width: "100%",
          maxWidth: 700,
        }}
      >
        {/* Language selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, color: "#3b4763" }}>
            Language:
          </span>
          {LANG_OPTS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLanguage(l.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 13,
                background:
                  language === l.id
                    ? "rgba(99,102,241,0.15)"
                    : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  language === l.id
                    ? "rgba(99,102,241,0.4)"
                    : "rgba(255,255,255,0.06)"
                }`,
                color: language === l.id ? "#a5b4fc" : "#475569",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>

        {/* Level grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
          }}
        >
          {LEVEL_OPTS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "14px 8px",
                borderRadius: 14,
                background:
                  level === l.id
                    ? "rgba(99,102,241,0.1)"
                    : "rgba(255,255,255,0.02)",
                border: `1px solid ${
                  level === l.id
                    ? "rgba(99,102,241,0.35)"
                    : "rgba(255,255,255,0.05)"
                }`,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 22 }}>{l.icon}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: level === l.id ? "#a5b4fc" : "#475569",
                }}
              >
                {l.label}
              </span>
              <span
                style={{ fontSize: 10, color: "#2d3748" }}
              >
                {l.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Custom topic input */}
        <div
          style={{
            display: "flex",
            gap: 10,
            borderRadius: 14,
            padding: "12px 16px",
            background: "rgba(10,14,26,0.7)",
            border: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go(custom)}
            placeholder="Type any topic… e.g. 'Schrödinger equation', 'Circular motion', 'प्रकाश'"
            className="input-glow"
            style={{
              flex: 1,
              background: "transparent",
              outline: "none",
              border: "none",
              fontSize: 14,
              color: "#e2e8f0",
              caretColor: "#6366f1",
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => go(custom)}
            disabled={!custom.trim()}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              background: custom.trim()
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : "rgba(99,102,241,0.08)",
              color: custom.trim() ? "#fff" : "#3b4763",
              cursor: custom.trim() ? "pointer" : "default",
              border: "none",
              boxShadow: custom.trim()
                ? "0 0 20px rgba(99,102,241,0.25)"
                : "none",
              transition: "all 0.2s",
            }}
          >
            Start →
          </motion.button>
        </div>

        {/* Topic grid */}
        {Object.entries(topics).map(([cat, list]) => (
          <div key={cat}>
            <h3
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color:
                  {
                    beginner: "#4ade80",
                    intermediate: "#f59e0b",
                    advanced: "#818cf8",
                  }[cat] || "#475569",
              }}
            >
              {{
                beginner: "🌱",
                intermediate: "⚡",
                advanced: "🚀",
              }[cat] || "📚"}{" "}
              {cat}
            </h3>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {list.map((t) => (
                <motion.button
                  key={t}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => go(t)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 10,
                    fontSize: 13,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#7a8ba8",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {t}
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </motion.div>

      <p style={{ fontSize: 11, color: "#1a2234", paddingBottom: 12 }}>
        Model: qwen2.5:14b · Ollama · Expandable to OpenAI / Claude
      </p>
    </div>
  );
}
