from __future__ import annotations

import re
from dataclasses import dataclass
from app.services.fallback import infer_animation_type


ALLOWED_TYPES = {"write", "speak", "animate", "draw", "ask", "quiz", "pause", "experiment"}
FORMULA_HINTS = ("=", "Δ", "∑", "∫", "lim", "d/d", "v =", "a =", "f =", "e =", "p =")


@dataclass
class ValidationReport:
    ok: bool
    confidence: float
    issues: list[str]


def _looks_like_formula(text: str) -> bool:
    lower = text.lower()
    return any(hint.lower() in lower for hint in FORMULA_HINTS)


def validate_steps(steps: list[dict], topic: str = "", student_msg: str = "") -> ValidationReport:
    issues: list[str] = []
    confidence = 0.85 if steps else 0.15

    if not steps:
        return ValidationReport(ok=False, confidence=0.0, issues=["empty steps"])

    seen_reasoning = False
    seen_visual = False
    topic_blob = f"{topic} {student_msg}".lower()
    inferred_topic_animation = infer_animation_type(topic_blob, topic)

    for step in steps:
        if not isinstance(step, dict):
            issues.append("non-dict step")
            confidence -= 0.12
            continue

        step_type = str(step.get("type", "")).strip().lower()
        if step_type not in ALLOWED_TYPES:
            issues.append(f"invalid step type: {step_type or 'missing'}")
            confidence -= 0.1

        content = " ".join(
            str(step.get(field, ""))
            for field in ("content", "caption", "question", "name", "setup", "expected_observation")
        ).strip()

        if step_type in {"write", "speak"} and content:
            seen_reasoning = seen_reasoning or len(content.split()) > 15 or _looks_like_formula(content)

        if step_type == "animate":
            seen_visual = True
            animation_type = str(step.get("animation_type", "")).strip().lower()
            if animation_type and inferred_topic_animation and animation_type != inferred_topic_animation:
                issues.append(f"animation mismatch: {animation_type} vs {inferred_topic_animation}")
                confidence -= 0.08

        if step_type == "write" and _looks_like_formula(content):
            seen_reasoning = True

    if any("derive" in part.lower() for part in (topic, student_msg)) and not seen_reasoning:
        issues.append("incomplete derivation")
        confidence -= 0.12

    if any(word in topic_blob for word in ("graph", "vector", "field", "orbit", "trajectory")) and not seen_visual:
        issues.append("missing visual step")
        confidence -= 0.07

    confidence = max(0.0, min(1.0, confidence))
    return ValidationReport(ok=confidence >= 0.45 and not any(i.startswith("invalid") for i in issues), confidence=confidence, issues=issues)
