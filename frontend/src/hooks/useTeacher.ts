"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore, TeachingStep } from "@/store/physics.store";
import { api } from "@/lib/api";
import {
  buildAnimationStep,
  normalizeTeachingSteps,
  wantsAnimation,
} from "@/lib/animationRequests";

const SLOW_FACTOR = 2.2;

export function useOrchestrator() {
  const store = useStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);
  const processedStepRef = useRef("");
  const lessonRequestIdRef = useRef(0);
  const lessonAbortRef = useRef<AbortController | null>(null);
  const askAbortRef = useRef<AbortController | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (store.mode !== "loading") return;
    if (loadingRef.current) return;
    loadingRef.current = true;

    lessonAbortRef.current?.abort();
    const controller = new AbortController();
    lessonAbortRef.current = controller;

    store.setAIThinking(true);
    store.setAIStatus("NOVA is preparing your lesson...");
    processedStepRef.current = "";

    const requestId = ++lessonRequestIdRef.current;
    let streamedSteps = 0;

    api
      .streamTeach(
        store.topic,
        "",
        store.sessionId,
        () => {},
        (step) => {
          if (requestId !== lessonRequestIdRef.current) return;
          const normalized = normalizeTeachingSteps([step as TeachingStep])[0] as TeachingStep;
          if (!normalized) return;

          if (streamedSteps === 0) {
            store.clearWhiteboard();
            store.setAnimation(null);
            store.setQuestion(null);
            store.setSteps([normalized]);
            store.setMode("classroom");
          } else {
            store.appendSteps([normalized]);
          }
          streamedSteps += 1;
        },
        (steps) => {
          if (requestId !== lessonRequestIdRef.current) return;
          const normalized = normalizeTeachingSteps(steps || []);

          if (normalized.length === 0 && streamedSteps === 0) {
            store.clearWhiteboard();
            store.setSteps([
              {
                type: "write",
                style: "text",
                content: "⚠️ NOVA returned an empty lesson. Please try again or choose a different topic.",
                duration: 5000,
              },
            ]);
            store.setMode("classroom");
            return;
          }

          if (streamedSteps === 0) {
            store.clearWhiteboard();
            store.setAnimation(null);
            store.setQuestion(null);
            store.setSteps(normalized);
            store.setMode("classroom");
            streamedSteps = normalized.length;
            return;
          }

          if (normalized.length > streamedSteps) {
            store.appendSteps(normalized.slice(streamedSteps));
            streamedSteps = normalized.length;
          }
        },
        controller.signal,
      )
      .catch((err: unknown) => {
        if (requestId !== lessonRequestIdRef.current) return;
        const error = err as { name?: string; message?: string };
        if (error?.name === "AbortError") return;
        console.error("[NOVA] Teach stream error:", error?.message || err);
        store.clearWhiteboard();
        store.setSteps([
          {
            type: "write",
            style: "text",
            content:
              "⚠️ Could not connect to the AI backend.\n\nPlease wait a bit and try again. The app is waiting for the model response, not using a local lesson fallback.",
            duration: 10000,
          },
        ]);
        store.setMode("classroom");
      })
      .finally(() => {
        if (requestId !== lessonRequestIdRef.current) return;
        store.setAIThinking(false);
        store.setAIStatus("Ready");
        loadingRef.current = false;
      });

    return () => {
      loadingRef.current = false;
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.mode]);

  const processStep = useCallback(
    (step: TeachingStep) => {
      const slow = store.slowMode ? SLOW_FACTOR : 1;
      const dur = (step.duration ?? 3500) * slow;

      switch (step.type) {
        case "write":
        case "speak":
          store.addEntry({
            type: step.type,
            style: step.style || "text",
            content: step.content || "",
          });
          store.setAIStatus("Writing...");
          timerRef.current = setTimeout(() => {
            store.setAIStatus("Ready");
            store.advanceStep();
          }, dur);
          break;

        case "animate":
          if (store.animationEnabled) {
            if (!step.params?.code && (step.animation_type === "3d_code" || step.animation_type === "code")) {
              store.setAIStatus("Generating Simulation...");
              store.setAIThinking(true);
              api.generateAnimationCode(store.topic, step.caption || "", store.sessionId)
                .then(res => {
                  store.setAnimation({
                    type: step.animation_type || "wave",
                    params: { ...step.params, code: res.code },
                    caption: step.caption || "",
                  });
                  store.setAIThinking(false);
                  store.setAIStatus("Simulating...");
                  timerRef.current = setTimeout(() => {
                    store.setAIStatus("Ready");
                    store.advanceStep();
                  }, dur);
                })
                .catch(err => {
                  console.error("Animator API error:", err);
                  store.setAIThinking(false);
                  store.advanceStep();
                });
              break; // Wait for async response
            }

            store.setAnimation({
              type: step.animation_type || "wave",
              params: step.params || {},
              caption: step.caption || "",
            });
          }
          store.setAIStatus("Simulating...");
          timerRef.current = setTimeout(() => {
            store.setAIStatus("Ready");
            store.advanceStep();
          }, dur);
          break;

        case "draw":
          store.addEntry({
            type: "draw",
            style: "diagram",
            content: `**Diagram: ${step.instruction}**\n${step.caption || ""}`,
          });
          timerRef.current = setTimeout(() => store.advanceStep(), dur);
          break;

        case "ask":
          store.setQuestion({
            question: step.question || "",
            hint: step.hint,
            expected: step.expected,
            isQuiz: false,
          });
          store.setIsPlaying(false);
          store.setAIStatus("Waiting for you...");
          break;

        case "quiz":
          store.setQuestion({
            question: step.question || step.content || "",
            options: step.options,
            correct: step.correct,
            explanation: step.explanation,
            isQuiz: true,
          });
          store.setIsPlaying(false);
          store.setAIStatus("Quiz time!");
          break;

        case "experiment":
          store.addEntry({
            type: "experiment",
            style: "highlight",
            content: `**🧪 Experiment: ${step.name}**\n\n${step.setup || ""}\n\n${(step.steps || [])
              .map((s, i) => `${i + 1}. ${s}`)
              .join("\n")}`,
          });
          timerRef.current = setTimeout(() => store.advanceStep(), dur);
          break;

        case "pause":
          store.setAIStatus(step.message || "Take a moment...");
          timerRef.current = setTimeout(() => {
            store.setAIStatus("Ready");
            store.advanceStep();
          }, dur);
          break;
      }
    },
    [store],
  );

  useEffect(() => {
    if (store.mode !== "classroom") return;
    if (!store.isPlaying) return;
    const step = store.steps[store.stepIndex];
    if (!step) return;

    const stepKey = `${store.stepIndex}:${store.steps.length}:${step.type}:${step.content || step.caption || step.question || ""}`;
    if (processedStepRef.current === stepKey) return;
    processedStepRef.current = stepKey;

    clearTimer();
    processStep(step);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.stepIndex, store.isPlaying, store.mode, processStep]);

  const dismissQuestion = useCallback(() => {
    store.setQuestion(null);
    store.setIsPlaying(true);
    store.advanceStep();
  }, [store]);

  const sendMessage = useCallback(
    async (message: string, imageBase64: string | null = null) => {
      clearTimer();
      processedStepRef.current = "";
      store.setIsPlaying(false);
      store.setAIThinking(true);
      store.setAIStatus("NOVA is thinking...");
      store.setQuestion(null);

      askAbortRef.current?.abort();
      const controller = new AbortController();
      askAbortRef.current = controller;

      store.addEntry({
        type: "speak",
        style: "student",
        content: message + (imageBase64 ? " 📸 [Image Attached]" : ""),
      });
      store.setAnimation(null);

      try {
        const responseStartIndex = store.steps.length;
        let streamedSteps = 0;

        await api.streamAsk(
          message,
          store.sessionId,
          imageBase64,
          () => {},
        (step) => {
            const normalized = normalizeTeachingSteps([step as TeachingStep])[0] as TeachingStep;
            if (!normalized) return;
            if (streamedSteps === 0) {
              store.appendSteps([normalized]);
              store.setStepIndex(responseStartIndex);
              processedStepRef.current = "";
              store.setIsPlaying(true);
            } else {
              store.appendSteps([normalized]);
            }
            streamedSteps += 1;
          },
          (steps) => {
            const normalized = normalizeTeachingSteps(steps || []) as TeachingStep[];
            if (normalized.length === 0 && streamedSteps === 0) {
              store.addEntry({
                type: "speak",
                style: "text",
                content: "Hmm, I did not get a clear response. Try asking again!",
              });
              return;
            }

            if (streamedSteps === 0 && normalized.length > 0) {
              store.appendSteps(normalized);
              store.setStepIndex(responseStartIndex);
              processedStepRef.current = "";
              store.setIsPlaying(true);
              streamedSteps = normalized.length;
              return;
            }

            if (normalized.length > streamedSteps) {
              store.appendSteps(normalized.slice(streamedSteps));
              streamedSteps = normalized.length;
            }
          },
          controller.signal,
        );
      } catch (err: unknown) {
        const error = err as { name?: string; message?: string };
        if (error?.name === "AbortError") return;
        console.error("[NOVA] Ask API error:", error?.message || err);
        store.addEntry({
          type: "speak",
          style: "note",
          content: "⚠️ Could not reach NOVA. Make sure the backend is running (`./start-backend.sh`).",
        });
        if (wantsAnimation(message) && store.animationEnabled) {
          const responseStartIndex = store.steps.length;
          store.appendSteps([buildAnimationStep(message, store.topic)]);
          store.setStepIndex(responseStartIndex);
          processedStepRef.current = "";
          store.setIsPlaying(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          store.setAIThinking(false);
          store.setAIStatus("Ready");
        }
      }
    },
    [store],
  );

  const continueLesson = useCallback(async () => {
    clearTimer();
    processedStepRef.current = "";
    store.setIsPlaying(false);
    store.setAIThinking(true);
    store.setAIStatus("Continuing...");

    try {
      const res = await api.continueLesson(store.sessionId);
      store.appendSteps(normalizeTeachingSteps(res.steps));
      store.setIsPlaying(true);
    } catch {
      store.addEntry({ type: "speak", style: "note", content: "⚠️ Error fetching next segment." });
    } finally {
      store.setAIThinking(false);
      store.setAIStatus("Ready");
    }
  }, [store]);

  const requestQuiz = useCallback(async () => {
    clearTimer();
    processedStepRef.current = "";
    store.setIsPlaying(false);
    store.setAIThinking(true);
    store.setAIStatus("Generating quiz...");
    try {
      const res = await api.quiz(store.sessionId, store.topic);
      store.clearWhiteboard();
      store.setSteps(normalizeTeachingSteps(res.steps));
      store.setMode("classroom");
    } catch {
      store.addEntry({ type: "speak", style: "note", content: "⚠️ Could not generate quiz." });
    } finally {
      store.setAIThinking(false);
      store.setAIStatus("Ready");
    }
  }, [store]);

  const requestExperiment = useCallback(async () => {
    clearTimer();
    processedStepRef.current = "";
    store.setIsPlaying(false);
    store.setAIThinking(true);
    store.setAIStatus("Designing experiment...");
    try {
      const res = await api.experiment(store.sessionId, store.topic);
      store.clearWhiteboard();
      store.setSteps(normalizeTeachingSteps(res.steps));
      store.setMode("classroom");
    } catch {
      store.addEntry({ type: "speak", style: "note", content: "⚠️ Could not design experiment." });
    } finally {
      store.setAIThinking(false);
      store.setAIStatus("Ready");
    }
  }, [store]);

  return { sendMessage, dismissQuestion, continueLesson, requestQuiz, requestExperiment };
}
