"use client";
/**
 * Physics Simulation Panel — Fixed, Always Visible, Never Scrolls
 *
 * Rules:
 * - Right side of the classroom, 380px wide
 * - NEVER scrolls with whiteboard
 * - Always visible
 * - Supports live AI-controlled visuals
 * - AI controls: playback, pause, replay, zoom, highlights, slow motion
 * - Canvas renders 2D physics simulations
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhysicsAnimator, AnimationType } from "@/lib/animations";
import { ThreeAnimator } from "@/lib/ThreeAnimator";
import { useStore, ActiveAnimation } from "@/store/physics.store";
import { api } from "@/lib/api";

interface Props {
  animation: ActiveAnimation | null;
}

const AVAILABLE_ANIMS = [
  { label: "Projectile", icon: "🎯", type: "projectile" },
  { label: "Wave", icon: "🌊", type: "wave" },
  { label: "Orbital", icon: "🪐", type: "orbital" },
  { label: "Pendulum", icon: "🔔", type: "pendulum" },
  { label: "Quantum", icon: "⚛️", type: "quantum_wave" },
  { label: "E-Field", icon: "⚡", type: "electric_field" },
  { label: "Spring", icon: "🔩", type: "spring" },
  { label: "Collision", icon: "💥", type: "collision" },
  { label: "Sun Blast", icon: "SUN", type: "solar_blast" },
  { label: "Gravity x2", icon: "g", type: "gravity_change" },
  { label: "Black Hole", icon: "BH", type: "black_hole" },
];

const DEFAULT_PARAMS: Record<string, Record<string, unknown>> = {
  projectile: { angle: 45, velocity: 20, gravity: 9.8 },
  wave: { frequency: 2, amplitude: 60 },
  orbital: { eccentricity: 0.2 },
  pendulum: { length: 1.5, angle: 30 },
  quantum_wave: { n: 2 },
  electric_field: { charges: [{ x: 0.35, y: 0.5, charge: 1 }, { x: 0.65, y: 0.5, charge: -1 }] },
  spring: { k: 10, mass: 1, amplitude: 0.2 },
  collision: { m1: 2, m2: 1, v1: 5, v2: 0, type: "elastic" },
  solar_blast: { scenario: "solar_blast", lightDelayMinutes: 8.3 },
  gravity_change: { scenario: "gravity_change", gravityFactor: 2 },
  black_hole: { scenario: "black_hole", lensing: true },
};

export default function SimulationPanel({ animation }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<PhysicsAnimator | null>(null);
  const threeAnimRef = useRef<ThreeAnimator | null>(null);
  const setAnimation = useStore((s) => s.setAnimation);
  const sliderValues = useStore((s) => s.sliderValues);
  const setSliderValue = useStore((s) => s.setSliderValue);

  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [editedCode, setEditedCode] = useState("");

  useEffect(() => {
    if (animation && animation.params && animation.params.code) {
      setEditedCode(animation.params.code as string);
    }
  }, [animation?.params?.code]);

  // Update liveSliders reference inside the running animation's params
  useEffect(() => {
    if (animation && animation.params) {
      animation.params.liveSliders = sliderValues;
    }
  }, [sliderValues, animation]);

  useEffect(() => {
    const el = canvasRef.current;
    const threeEl = threeContainerRef.current;
    if (el) animRef.current = new PhysicsAnimator(el);
    if (threeEl) threeAnimRef.current = new ThreeAnimator(threeEl);

    return () => {
      animRef.current?.stop();
      threeAnimRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!animRef.current || !threeAnimRef.current) return;
    
    // Stop both by default
    animRef.current.stop();
    threeAnimRef.current.stop();

    if (animation) {
      if (animation.type === "3d_code") {
        threeAnimRef.current.start(animation.params, async (err) => {
          if (!animation.params?.code) return;
          console.log("[Critic Agent] Requesting fix for error:", err.message);
          
          setAnimation({
            ...animation,
            caption: `⚠️ AI Code crashed! Critic Agent is fixing it...`,
          });
          
          try {
            // Using useStore.getState() is safe in a callback to get current sessionId
            const res = await api.fixCode(animation.params.code as string, err.message, useStore.getState().sessionId);
            setEditedCode(res.fixed_code);
            setAnimation({
              ...animation,
              caption: `✅ Critic Agent fixed the code!`,
              params: { ...animation.params, code: res.fixed_code },
            });
          } catch (e) {
            setAnimation({ ...animation, caption: `❌ Critic failed to fix code.` });
          }
        });
      } else {
        animRef.current.start(animation.type as AnimationType, animation.params);
      }
    }
  }, [animation]);

  return (
    <div
      id="simulation-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#060a12",
        overflow: "hidden",
      }}
    >
      {/* ═══ PANEL HEADER ═══ */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderBottom: "1px solid rgba(99,102,241,0.08)",
          background: "rgba(6,10,18,0.9)",
        }}
      >
        {/* Status dot */}
        <motion.div
          animate={
            animation
              ? { opacity: [1, 0.4, 1], scale: [1, 0.9, 1] }
              : { opacity: 0.25, scale: 1 }
          }
          transition={animation ? { duration: 1.5, repeat: Infinity } : {}}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: animation ? "#4ade80" : "#334155",
            boxShadow: animation ? "0 0 8px #4ade8060" : "none",
          }}
        />

        {/* Label */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: animation
              ? "rgba(99,102,241,0.7)"
              : "rgba(99,102,241,0.25)",
          }}
        >
          Physics Simulation
        </span>

        {/* Hack Code Button */}
        <AnimatePresence>
          {Boolean(animation?.params?.code) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setShowCodeEditor(!showCodeEditor)}
              style={{
                marginLeft: "auto",
                fontSize: 11,
                fontWeight: 600,
                color: showCodeEditor ? "#fff" : "#a78bfa",
                padding: "4px 10px",
                borderRadius: 6,
                background: showCodeEditor ? "#8b5cf6" : "rgba(167,139,250,0.1)",
                border: `1px solid ${showCodeEditor ? "#8b5cf6" : "rgba(167,139,250,0.2)"}`,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>💻</span> {showCodeEditor ? "Close Editor" : "Hack Code"}
            </motion.button>
          )}
        </AnimatePresence>

        {/* LIVE badge when active */}
        <AnimatePresence>
          {animation && !animation.params?.code && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                marginLeft: "auto",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "#4ade80",
                padding: "2px 6px",
                borderRadius: 4,
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.15)",
              }}
            >
              ● LIVE
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ CANVAS AREA ═══ */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* 2D Canvas */}
        <canvas
          ref={canvasRef}
          width={760}
          height={700}
          style={{
            width: "100%",
            height: "100%",
            display: animation?.type === "3d_code" ? "none" : "block",
          }}
        />

        {/* 3D WebGL Container */}
        <div
          ref={threeContainerRef}
          style={{
            width: "100%",
            height: "100%",
            display: animation?.type === "3d_code" ? "block" : "none",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />

        {/* Placeholder when no animation is active */}
        <AnimatePresence>
          {!animation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                pointerEvents: "none",
                background: "rgba(6,10,18,0.85)",
              }}
            >
              {/* Slowly rotating atom */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 30,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{ fontSize: 44, opacity: 0.12 }}
              >
                ⚛️
              </motion.div>

              {/* Hint text */}
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    color: "rgba(99,102,241,0.25)",
                    fontSize: 12,
                    lineHeight: 2,
                    fontFamily: "'Caveat', cursive",
                  }}
                >
                  Say &quot;show animation&quot;
                  <br />
                  or &quot;visualize this&quot;
                  <br />
                  to activate the simulation
                </p>
              </div>

              {/* Faint grid overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.03,
                  backgroundImage:
                    "radial-gradient(circle at center, rgba(99,102,241,0.5) 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                  pointerEvents: "none",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ HACKER CONSOLE OVERLAY ═══ */}
        <AnimatePresence>
          {showCodeEditor && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(6, 10, 18, 0.95)",
                backdropFilter: "blur(4px)",
                display: "flex",
                flexDirection: "column",
                zIndex: 50,
                borderTop: "1px solid rgba(139, 92, 246, 0.3)",
              }}
            >
              <div style={{ padding: "8px 14px", background: "rgba(139, 92, 246, 0.1)", fontSize: 12, color: "#c4b5fd", fontFamily: "monospace", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>// Student Code Editor</span>
                <button 
                  onClick={() => {
                    if (animation) {
                      setAnimation({ ...animation, params: { ...animation.params, code: editedCode } });
                      setShowCodeEditor(false);
                    }
                  }}
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 12px",
                    color: "white",
                    fontSize: 12,
                    fontWeight: "bold",
                    cursor: "pointer",
                    boxShadow: "0 0 10px rgba(139, 92, 246, 0.4)",
                  }}
                >
                  ⚡ RUN HACK
                </button>
              </div>
              <textarea
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                spellCheck={false}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#e2e8f0",
                  fontFamily: "'Fira Code', 'Consolas', monospace",
                  fontSize: 13,
                  lineHeight: 1.6,
                  padding: "14px",
                  resize: "none",
                  whiteSpace: "pre",
                  overflowWrap: "normal",
                  overflowX: "auto",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ CAPTION BAR ═══ */}
      <AnimatePresence>
        {animation?.caption && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={{
              flexShrink: 0,
              padding: "8px 14px",
              borderTop: "1px solid rgba(99,102,241,0.08)",
              fontSize: 11,
              color: "rgba(165,180,252,0.65)",
              textAlign: "center",
              background: "rgba(99,102,241,0.03)",
              fontFamily: "'Kalam', cursive",
            }}
          >
            {animation.caption}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SLIDERS PANEL ═══ */}
      <AnimatePresence>
        {animation?.params?.sliders && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              flexShrink: 0,
              padding: "12px 14px",
              borderTop: "1px solid rgba(99,102,241,0.08)",
              background: "rgba(6,10,18,0.9)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {(animation.params.sliders as any[]).map((slider) => {
              const val = sliderValues[slider.name] ?? slider.val;
              return (
                <div key={slider.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                    <span>{slider.name}</span>
                    <span style={{ color: "#a78bfa", fontFamily: "monospace" }}>{val.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={(slider.max - slider.min) / 100}
                    value={val}
                    onChange={(e) => setSliderValue(slider.name, parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#818cf8" }}
                  />
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ AVAILABLE ANIMATIONS HINT ═══ */}
      {!animation && (
        <div
          style={{
            flexShrink: 0,
            padding: "10px 10px",
            borderTop: "1px solid rgba(99,102,241,0.05)",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            justifyContent: "center",
            background: "rgba(6,10,18,0.4)",
          }}
        >
          {AVAILABLE_ANIMS.map((a) => {
            return (
              <motion.button
                key={a.label}
                whileHover={{ scale: 1.05, backgroundColor: "rgba(99,102,241,0.12)", borderColor: "rgba(99,102,241,0.25)", color: "rgba(165,180,252,0.85)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAnimation({
                  type: a.type,
                  params: DEFAULT_PARAMS[a.type] || {},
                  caption: `Interactive Simulation: ${a.label} Motion`,
                })}
                style={{
                  fontSize: 9,
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "rgba(99,102,241,0.03)",
                  border: "1px solid rgba(99,102,241,0.08)",
                  color: "rgba(99,102,241,0.4)",
                  letterSpacing: "0.04em",
                  display: "flex",
                  alignItems: "center",
                  gap: 3.5,
                  cursor: "pointer",
                  transition: "color 0.2s, border-color 0.2s",
                  outline: "none",
                }}
              >
                <span style={{ fontSize: 10 }}>{a.icon}</span>
                {a.label}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
