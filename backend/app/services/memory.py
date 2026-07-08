"""
AI Memory System
Tracks per-session: topic history, student understanding, weak areas, interaction log.
Provides context injection for adaptive teaching.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import time


@dataclass
class ConceptRecord:
    concept: str
    times_explained: int = 0
    student_understood: Optional[bool] = None
    last_visited: float = field(default_factory=time.time)


@dataclass
class AIMemory:
    session_id: str
    language: str = "auto"          # en | hi | hinglish | auto
    student_level: str = "auto"     # beginner | intermediate | advanced | auto
    current_topic: str = ""
    topic_history: list[str] = field(default_factory=list)
    concept_map: dict[str, ConceptRecord] = field(default_factory=dict)
    interaction_log: list[dict] = field(default_factory=list)  # {role, content, ts}
    weak_areas: list[str] = field(default_factory=list)
    strong_areas: list[str] = field(default_factory=list)
    total_questions_asked: int = 0
    correct_answers: int = 0
    slow_mode: bool = False
    animation_enabled: bool = True

    def record_concept(self, concept: str):
        if concept not in self.concept_map:
            self.concept_map[concept] = ConceptRecord(concept=concept)
        rec = self.concept_map[concept]
        rec.times_explained += 1
        rec.last_visited = time.time()

    def mark_understood(self, concept: str, understood: bool):
        if concept in self.concept_map:
            self.concept_map[concept].student_understood = understood
        if understood and concept not in self.strong_areas:
            self.strong_areas.append(concept)
        if not understood and concept not in self.weak_areas:
            self.weak_areas.append(concept)

    def add_interaction(self, role: str, content: str):
        self.interaction_log.append({"role": role, "content": content, "ts": time.time()})
        # Keep last 30 interactions
        if len(self.interaction_log) > 30:
            self.interaction_log = self.interaction_log[-30:]

    def get_conversation_messages(self) -> list[dict]:
        return [{"role": i["role"], "content": i["content"]} for i in self.interaction_log]

    def context_summary(self) -> str:
        weak = ", ".join(self.weak_areas[-3:]) if self.weak_areas else "none identified"
        history = ", ".join(self.topic_history[-5:]) if self.topic_history else "none"
        lang_note = {
            "hi": "Respond in Hindi.",
            "hinglish": "Respond in Hinglish (mix of Hindi and English, like a friendly Indian teacher).",
            "en": "Respond in English.",
            "auto": "Detect the student's language from their message and respond accordingly.",
        }.get(self.language, "")
        return (
            f"Session context:\n"
            f"- Current topic: {self.current_topic}\n"
            f"- Topics covered: {history}\n"
            f"- Student level: {self.student_level}\n"
            f"- Weak areas: {weak}\n"
            f"- Slow mode: {self.slow_mode}\n"
            f"- Animation enabled: {self.animation_enabled}\n"
            f"- Language: {lang_note}"
        )


class MemoryStore:
    """In-memory store for all active sessions."""
    _sessions: dict[str, AIMemory] = {}

    @classmethod
    def get(cls, session_id: str) -> AIMemory:
        if session_id not in cls._sessions:
            cls._sessions[session_id] = AIMemory(session_id=session_id)
        return cls._sessions[session_id]

    @classmethod
    def reset(cls, session_id: str):
        mem = cls.get(session_id)
        lang = mem.language
        level = mem.student_level
        cls._sessions[session_id] = AIMemory(
            session_id=session_id, language=lang, student_level=level
        )

    @classmethod
    def update_prefs(cls, session_id: str, language: str = None, level: str = None,
                     slow_mode: bool = None, animation_enabled: bool = None):
        mem = cls.get(session_id)
        if language:
            mem.language = language
        if level:
            mem.student_level = level
        if slow_mode is not None:
            mem.slow_mode = slow_mode
        if animation_enabled is not None:
            mem.animation_enabled = animation_enabled
