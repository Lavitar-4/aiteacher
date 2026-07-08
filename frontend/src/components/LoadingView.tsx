"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useStore } from "@/store/physics.store";

const PHYSICS_FACTS = [
  "Nothing can travel faster than light - 299,792,458 m/s",
  "Quantum particles exist in superposition until observed",
  "E = mc^2 - mass and energy are equivalent",
  "Gravity warps the fabric of spacetime",
  "Every atom in your body was forged in a star",
];

export default function LoadingView() {
  const { topic, aiStatus } = useStore();
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFactIndex((i) => (i + 1) % PHYSICS_FACTS.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const fact = PHYSICS_FACTS[factIndex];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: 40,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 144,
          height: 144,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              inset: i * 12,
              borderRadius: "50%",
              border: `1px solid rgba(99,102,241,${0.55 - i * 0.1})`,
            }}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.7, 0.25, 0.7],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
          />
        ))}
        <span style={{ fontSize: 40, zIndex: 10 }}>Atom</span>
      </div>

      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <motion.p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#a5b4fc",
            fontFamily: "'Caveat', cursive",
            letterSpacing: "0.03em",
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {aiStatus || "NOVA is preparing your lesson..."}
        </motion.p>
        <p style={{ fontSize: 12, color: "#2d3748" }}>
          Topic: <span style={{ color: "#6366f1" }}>{topic}</span>
        </p>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#6366f1",
            }}
            animate={{
              y: [0, -14, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.25,
            }}
          />
        ))}
      </div>

      <p
        style={{
          fontSize: 12,
          textAlign: "center",
          maxWidth: 360,
          padding: "0 16px",
          fontStyle: "italic",
          color: "#1a2f4a",
          fontFamily: "'Kalam', cursive",
        }}
      >
        &quot;{fact}&quot;
      </p>
    </div>
  );
}
