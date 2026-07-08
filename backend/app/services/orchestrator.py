"""
AI Teaching Orchestrator v2
============================
The AI IS the teacher. It decides EVERYTHING dynamically:
- what to explain
- what to draw on the whiteboard
- when to animate
- when to ask questions
- when to pause
- when to simplify or advance
- language (Hindi / English / Hinglish)

Model: qwen2.5:14b via Ollama
"""
from __future__ import annotations
import asyncio
import json
import re
import ast
from typing import AsyncIterator
from app.core.config import settings
from app.services.ai_router import get_router
from app.services.memory import MemoryStore, AIMemory
from app.services.fallback import answer_steps, lesson_steps
from app.services.response_validator import validate_steps
import os

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "templates.json")
try:
    with open(TEMPLATE_PATH, "r") as f:
        RAG_TEMPLATES = json.load(f)
except Exception:
    RAG_TEMPLATES = {}

# ─────────────────────────────────────────────
# SYSTEM PROMPT
# ─────────────────────────────────────────────
SYSTEM_PROMPT = """You are NOVA, a WORLD-CLASS, highly energetic, and brilliant AI Physics Professor.
Your goal is to blow the student's mind with interactive, deeply intuitive physics explanations.
You MUST reply primarily in HINGLISH (Hindi written in English script) by default, using simple, conversational, and energetic language like a friendly Indian teacher!

CRITICAL OUTPUT FORMAT:
- You MUST return a pure JSON array of step objects.
- DO NOT wrap the array in another object. Correct: `[{"type": "speak", "content": "..."}]`
- EVERY step MUST have a `"type"` string: `speak`, `write`, `ask`, `quiz`, `pause`, `experiment`, `animate`.
- Never use keys like `"speak": "..."`. ALWAYS use `{"type": "speak", "content": "..."}`.

ANIMATION RULES:
- ALWAYS add an `animate` step when explaining a physical scenario!
- You DO NOT need to write code. Just output: `{"type": "animate", "animation_type": "3d_code", "caption": "A detailed description of the scenario to simulate"}`
- Example: `{"type": "animate", "animation_type": "3d_code", "caption": "Dropping a 5kg box and a 1kg sphere to show gravity"}`
- A dedicated Animator AI will automatically generate the simulation code based on your caption.

HIGH-QUALITY TEACHING FRAMEWORK:
You MUST follow this exact sequence for maximum impact:
1. THE HOOK (speak/write): Introduce the concept with a mind-blowing real-world fact.
2. THE SHOW (animate): Request an animation using the `animate` step.
3. THE DEEP DIVE (speak): Explicitly reference what is happening in the animation. Explain the "WHY". Be rigorous but intuitive.
4. THE CHALLENGE (ask/quiz): Ask a "What-if" question to force them to think.
"""

ANIMATOR_PROMPT = """You are NOVA's Expert 3D Physics Animator.
Your ONLY job is to generate flawless JavaScript code for a 3D physics simulation based on the teacher's request.

VARIABLES AVAILABLE: `THREE`, `CANNON`, `PhysicsSDK`, `scene`, `world`, `sdk`, `camera`, `renderer`, `t` (time), `S` (sliders), and `_ctx` (persistent context).

RULES:
- Return ONLY valid Javascript code. NO markdown blocks, NO explanations.
- The `sdk` object has powerful methods: `sdk.createSphere(radius, mass, color, {x,y,z})`, `sdk.createBox(w, h, d, mass, color, {x,y,z})`, and `sdk.createFloor(color)`.
- Use `_ctx` to initialize things once: 
  `if (!_ctx.init) { _ctx.init=true; sdk.createFloor(0x223344); _ctx.ball = sdk.createSphere(1, 5, 0xff0000, {x:0, y:10, z:0}); }`
- INTERACTIVE SLIDERS: You can read sliders using `S.SliderName` (e.g. `let g = S.Gravity;`). The frontend will automatically detect and create these sliders if you define them in the return JSON (handled separately). For now, just use them safely: `let speed = S.Speed || 1;`
- DO NOT use `window.sun = ...` or `if (t === 0) { ... }` — these cause crashes! Use `_ctx.init`.
- DO NOT setup lighting, cameras, or controls. They are already provided.

Write extremely beautiful, physically accurate code.
"""
def _parse(raw: str) -> list[dict]:
    """Parse AI output into a normalized steps list.

    The model is supposed to return pure JSON, but in practice it may emit:
    - a JSON array
    - a JSON object with a top-level `steps` key
    - Python-style dict/list text with single quotes
    - fenced code blocks
    - a final plain-text explanation
    """
    raw = raw.strip()
    # Strip markdown fences
    raw = re.sub(r"^```[a-z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)
    raw = raw.strip()

    def _as_steps(data):
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            steps = data.get("steps")
            if isinstance(steps, list):
                return steps
            return [data]
        return [{"type": "speak", "content": str(data), "duration": 5000}]

    def _try_parse(text: str):
        try:
            return json.loads(text)
        except Exception:
            try:
                return ast.literal_eval(text)
            except Exception:
                return None

    parsed = _try_parse(raw)
    if parsed is not None:
        return _as_steps(parsed)

    # Try to extract a JSON array/object from surrounding text.
    for pattern in (r"\{.*\}", r"\[.*\]"):
        m = re.search(pattern, raw, re.DOTALL)
        if not m:
            continue
        parsed = _try_parse(m.group())
        if parsed is not None:
            return _as_steps(parsed)

    try:
        return _as_steps(json.loads(raw))
    except Exception:
        # Fallback: plain text as speak step
        return [{"type": "speak", "content": raw, "duration": 5000}]


class Orchestrator:
    """
    The AI teaching brain. One instance per session.
    Holds conversation history and memory reference.
    """

    def __init__(self, session_id: str = "default"):
        self.session_id = session_id
        self.router = get_router()
        self.main_model = settings.ollama_model
        self.fast_model = getattr(settings, "ollama_fast_model", self.main_model)
        self._lock = asyncio.Lock()

    @property
    def memory(self) -> AIMemory:
        return MemoryStore.get(self.session_id)

    def _build_system(self, topic: str = "", student_msg: str = "") -> str:
        base = SYSTEM_PROMPT + "\n\n" + self.memory.context_summary()
        search = (topic + " " + student_msg).lower()
        if search:
            for key, data in RAG_TEMPLATES.items():
                if any(kw in search for kw in data.get("keywords", [])):
                    base += f"\n\n[RAG VERIFIED TEMPLATE]: You MUST use this exact JavaScript physics code for the {key} animation. Modify variables only if requested by the student.\n```javascript\n{data['template']}\n```"
                    break
        return base

    def _repair_steps(self, steps: list[dict], topic: str = "", student_msg: str = "") -> list[dict]:
        repaired: list[dict] = []
        for item in steps or []:
            if not isinstance(item, dict):
                continue
            step = dict(item)
            if not step.get("type"):
                if step.get("question"):
                    step["type"] = "ask" if step.get("hint") or step.get("expected") else "quiz"
                elif step.get("instruction"):
                    step["type"] = "draw"
                elif step.get("animation_type") or step.get("params"):
                    step["type"] = "animate"
                else:
                    step["type"] = "write"
            if step["type"] == "animate":
                from app.services.fallback import infer_animation_type

                anim_type = step.get("animation_type")
                valid_types = {"solar_blast", "gravity_change", "black_hole", "projectile", "pendulum", "wave", "doppler", "orbital", "electric_field", "collision", "spring", "quantum_wave", "gravitational_field", "atom", "nuclear", "custom", "code", "3d_code"}
                
                if not anim_type or anim_type not in valid_types:
                    text = " ".join(
                        str(step.get(field, ""))
                        for field in ("content", "caption", "question", "name", "setup", "expected_observation")
                    )
                    anim_type = infer_animation_type(f"{text} {student_msg}", topic)

                step["animation_type"] = anim_type
                step.setdefault("params", {})
                step.setdefault("caption", f"Showing {anim_type.replace('_', ' ')} animation")
            repaired.append(step)

        if not repaired:
            repaired = lesson_steps(topic) if not student_msg else answer_steps(student_msg, topic)

        report = validate_steps(repaired, topic, student_msg)
        if not report.ok and report.confidence < 0.35:
            repaired = lesson_steps(topic) if not student_msg else answer_steps(student_msg, topic)

        return repaired

    async def _complete_steps(
        self,
        messages: list[dict],
        system: str,
        *,
        task: str,
        topic: str,
        student_msg: str = "",
        image: str | None = None,
    ) -> str:
        return (
            await self.router.complete(
                task=task,
                topic=topic,
                student_msg=student_msg,
                image=image,
                messages=messages,
                system=system,
            )
        ).text

    async def _stream_text(
        self,
        messages: list[dict],
        system: str,
        *,
        task: str,
        topic: str,
        student_msg: str = "",
        image: str | None = None,
    ) -> AsyncIterator[str]:
        async for chunk in self.router.stream(
            task=task,
            topic=topic,
            student_msg=student_msg,
            image=image,
            messages=messages,
            system=system,
        ):
            yield chunk

    # ── Teach a new topic ──────────────────────────────────────────────

    async def teach(self, topic: str, student_msg: str = "") -> list[dict]:
        async with self._lock:
            mem = self.memory
            mem.current_topic = topic
            if topic not in mem.topic_history:
                mem.topic_history.append(topic)

            user_content = (
                f'Start teaching: "{topic}"\n'
                f'Student says: "{student_msg or "Please start the lesson."}"'
            )
            mem.add_interaction("user", user_content)
            try:
                response = await self._complete_steps(
                    messages=mem.get_conversation_messages(),
                    system=self._build_system(topic=topic, student_msg=student_msg),
                    task="teach",
                    topic=topic,
                    student_msg=student_msg,
                )
                mem.add_interaction("assistant", response)
                steps = self._repair_steps(_parse(response), topic, student_msg)
            except Exception:
                steps = lesson_steps(topic)
                mem.add_interaction("assistant", json.dumps(steps, ensure_ascii=False))
            for s in steps:
                if s.get("type") in ("write", "speak"):
                    mem.record_concept(topic)
            return steps

    async def stream_teach(self, topic: str, student_msg: str = "") -> AsyncIterator[str]:
        async with self._lock:
            mem = self.memory
            mem.current_topic = topic
            if topic not in mem.topic_history:
                mem.topic_history.append(topic)

            user_content = (
                f'Start teaching: "{topic}"\n'
                f'Student says: "{student_msg or "Please start the lesson."}"'
            )
            mem.add_interaction("user", user_content)

            full = ""
            async for chunk in self._stream_text(
                messages=mem.get_conversation_messages(),
                system=self._build_system(topic=topic, student_msg=student_msg),
                task="teach",
                topic=topic,
                student_msg=student_msg,
            ):
                full += chunk
                yield chunk

            mem.add_interaction("assistant", full)

    # ── Student asks something ─────────────────────────────────────────

    async def respond(self, student_msg: str, image: str | None = None) -> list[dict]:
        async with self._lock:
            mem = self.memory
            mem.add_interaction("user", student_msg + (" [Image Attached]" if image else ""))
            try:
                response = await self._complete_steps(
                    messages=mem.get_conversation_messages(),
                    system=self._build_system(topic=mem.current_topic, student_msg=student_msg),
                    task="respond",
                    topic=mem.current_topic,
                    student_msg=student_msg,
                    image=image,
                )
                mem.add_interaction("assistant", response)
                return self._repair_steps(_parse(response), mem.current_topic, student_msg)
            except Exception as e:
                import traceback
                traceback.print_exc()
                print("Exception in respond:", e)
                steps = answer_steps(student_msg, mem.current_topic)
                mem.add_interaction("assistant", json.dumps(steps, ensure_ascii=False))
                return steps

    async def stream_respond(self, student_msg: str, image: str | None = None) -> AsyncIterator[str]:
        async with self._lock:
            mem = self.memory
            mem.add_interaction("user", student_msg + (" [Image Attached]" if image else ""))

            full = ""
            async for chunk in self._stream_text(
                messages=mem.get_conversation_messages(),
                system=self._build_system(topic=mem.current_topic, student_msg=student_msg),
                task="respond",
                topic=mem.current_topic,
                student_msg=student_msg,
                image=image,
            ):
                full += chunk
                yield chunk

            mem.add_interaction("assistant", full)

    # ── Continue current lesson ────────────────────────────────────────

    async def continue_lesson(self) -> list[dict]:
        return await self.respond("Continue the lesson from where you left off.")

    # ── Generate quiz ──────────────────────────────────────────────────

    async def generate_quiz(self, topic: str = "") -> list[dict]:
        async with self._lock:
            mem = self.memory
            t = topic or mem.current_topic
            prompt = f"Generate a 3-question quiz about {t}. Use quiz steps only."
            mem.add_interaction("user", prompt)
            try:
                response = await self._complete_steps(
                    messages=mem.get_conversation_messages(),
                    system=self._build_system(topic=t, student_msg=prompt),
                    task="quiz",
                    topic=t,
                    student_msg=prompt,
                )
                mem.add_interaction("assistant", response)
                return self._repair_steps(_parse(response), t, prompt)
            except Exception:
                steps = self.router.fallback_steps("quiz", t, prompt)
                mem.add_interaction("assistant", json.dumps(steps, ensure_ascii=False))
                return steps

    # ── Generate experiment ────────────────────────────────────────────

    async def generate_experiment(self, concept: str = "") -> list[dict]:
        async with self._lock:
            mem = self.memory
            c = concept or mem.current_topic
            prompt = f"Design a virtual experiment to demonstrate: {c}. Use experiment steps."
            mem.add_interaction("user", prompt)
            try:
                response = await self._complete_steps(
                    messages=mem.get_conversation_messages(),
                    system=self._build_system(topic=c, student_msg=prompt),
                    task="experiment",
                    topic=c,
                    student_msg=prompt,
                )
                mem.add_interaction("assistant", response)
                return self._repair_steps(_parse(response), c, prompt)
            except Exception:
                steps = self.router.fallback_steps("experiment", c, prompt)
                mem.add_interaction("assistant", json.dumps(steps, ensure_ascii=False))
                return steps


# Global session store
_orchestrators: dict[str, Orchestrator] = {}


def get_orchestrator(session_id: str = "default") -> Orchestrator:
    if session_id not in _orchestrators:
        _orchestrators[session_id] = Orchestrator(session_id)
    return _orchestrators[session_id]


def reset_orchestrator(session_id: str):
    _orchestrators.pop(session_id, None)
    MemoryStore.reset(session_id)



