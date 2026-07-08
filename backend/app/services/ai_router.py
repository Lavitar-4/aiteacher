from __future__ import annotations

import json
from dataclasses import dataclass

from app.core.config import settings
from app.core.ai_provider import GeminiProvider
from app.services.fallback import answer_steps, lesson_steps


@dataclass
class RouterResult:
    text: str
    route: str
    provider: str
    model: str
    confidence: float
    reason: str


class GeminiRouter:
    def __init__(self):
        self.provider = GeminiProvider()

    def _trim_messages(self, messages: list[dict]) -> list[dict]:
        max_messages = max(4, settings.router_max_messages)
        max_chars = max(2000, settings.router_max_context_chars)

        trimmed = messages[-max_messages:]
        result: list[dict] = []
        char_count = 0
        for item in trimmed:
            if not isinstance(item, dict):
                continue
            role = str(item.get("role", "user"))
            content = str(item.get("content", ""))
            content = content[:max_chars]
            char_count += len(content)
            result.append({"role": role, "content": content})
            if char_count >= max_chars:
                break
        return result

    def _compose_prompt(self, system: str, messages: list[dict], task: str, topic: str = "", student_msg: str = "") -> str:
        lines = [
            system.strip(),
            "",
            "You are inside a physics teacher router.",
            f"Task: {task}",
            f"Topic: {topic or 'unknown'}",
            f"Student message: {student_msg or 'n/a'}",
            "",
            "Return pure JSON array only. Each array item must be a step object.",
            "You MUST provide DEEP, ACCURATE, and COMPLETE physics explanations.",
            "If an animation is shown, explicitly explain what is happening inside the animation and how it relates to the physics concept.",
            "NEVER cut off your response prematurely.",
            "",
            "Conversation context:",
        ]
        for item in messages:
            role = str(item.get("role", "user")).upper()
            content = str(item.get("content", "")).strip()
            lines.append(f"{role}: {content}")
        return "\n".join(lines).strip()

    def fallback_steps(self, task: str, topic: str, student_msg: str) -> list[dict]:
        if task in {"quiz"}:
            return [
                {
                    "type": "quiz",
                    "question": f"What is the central idea of {topic or 'this topic'}?",
                    "options": [
                        "It explains a core physics relationship",
                        "It is unrelated to physics",
                        "It only covers memorization",
                        "It has no measurable quantity",
                    ],
                    "correct": 0,
                    "explanation": "A quiz should check the main physics idea, not random facts.",
                }
            ]
        if task in {"experiment"}:
            return [
                {
                    "type": "experiment",
                    "name": f"{topic or 'Physics'} demonstration",
                    "setup": f"Use a simple virtual setup to demonstrate {topic or 'the concept'}.",
                    "steps": ["Observe the initial state.", "Change one variable at a time."],
                    "expected_observation": "A clear cause-effect pattern should appear.",
                    "duration": 7000,
                }
            ]
        if task in {"respond"} and student_msg:
            return answer_steps(student_msg, topic)
        return lesson_steps(topic)

    async def complete(
        self,
        *,
        task: str,
        topic: str,
        student_msg: str,
        messages: list[dict],
        system: str,
        image: str | None = None,
    ) -> RouterResult:
        trimmed = self._trim_messages(messages)
        prompt = self._compose_prompt(system, trimmed, task, topic, student_msg)
        
        try:
            text = await self.provider.complete([{"role": "user", "content": prompt}], "", image)
            return RouterResult(
                text=text,
                route="gemini_main",
                provider="gemini",
                model="gemini",
                confidence=0.99,
                reason="Gemini direct API call"
            )
        except Exception as e:
            print(f"Gemini complete error: {e}")
            fallback_text = json.dumps(self.fallback_steps(task, topic, student_msg), ensure_ascii=False)
            return RouterResult(
                text=fallback_text,
                route="fallback",
                provider="fallback",
                model="rules",
                confidence=0.1,
                reason="API failure fallback"
            )

    async def stream(
        self,
        *,
        task: str,
        topic: str,
        student_msg: str,
        messages: list[dict],
        system: str,
        image: str | None = None,
    ):
        trimmed = self._trim_messages(messages)
        prompt = self._compose_prompt(system, trimmed, task, topic, student_msg)

        try:
            async for chunk in self.provider.stream([{"role": "user", "content": prompt}], "", image):
                yield chunk
        except Exception as e:
            print(f"Gemini stream error: {e}")
            fallback_text = json.dumps(self.fallback_steps(task, topic, student_msg), ensure_ascii=False)
            yield fallback_text


_router: GeminiRouter | None = None


def get_router() -> GeminiRouter:
    global _router
    if _router is None:
        _router = GeminiRouter()
    return _router
