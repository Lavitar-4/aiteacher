"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useStore } from "@/store/physics.store";
import { useOrchestrator } from "@/hooks/useTeacher";
import { api } from "@/lib/api";
import HomeView from "@/components/HomeView";
import Classroom from "@/components/LessonView";
import LoadingView from "@/components/LoadingView";

export default function Page() {
  const { mode, setBackendOnline, setModelReady } = useStore();

  // Mount orchestrator at root so it's always running
  useOrchestrator();

  // Health check on mount
  useEffect(() => {
    const check = async () => {
      try {
        await api.health();
        setBackendOnline(true);
        const m = await api.checkModel();
        setModelReady(m.available);
      } catch {
        setBackendOnline(false);
        setModelReady(false);
      }
    };
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, [setBackendOnline, setModelReady]);

  return (
    <AnimatePresence mode="wait">
      {mode === "home" && (
        <motion.div key="home"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ height: "100dvh", overflow: "hidden" }}>
          <HomeView />
        </motion.div>
      )}
      {mode === "loading" && (
        <motion.div key="loading"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ height: "100dvh" }}>
          <LoadingView />
        </motion.div>
      )}
      {mode === "classroom" && (
        <motion.div key="classroom"
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          style={{ height: "100dvh" }}>
          <Classroom />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
