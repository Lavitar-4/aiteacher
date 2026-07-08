"""
Physics AI Teacher — API Routes v2
All endpoints drive the AI orchestrator.
SSE streaming for real-time AI responses.
Error handling ensures the backend never crashes.
"""
from __future__ import annotations
import json
import ast
import traceback
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.services.orchestrator import get_orchestrator, reset_orchestrator, _parse
from app.services.ai_router import get_router
from app.services.memory import MemoryStore
from app.services.fallback import answer_steps, lesson_steps

router = APIRouter(prefix="/api/v1", tags=["nova"])


# ── Schemas ────────────────────────────────────────────────────────────

class TeachRequest(BaseModel):
    topic: str
    student_message: str = ""
    session_id: str = "default"

class AskRequest(BaseModel):
    message: str
    image: Optional[str] = None
    session_id: str = "default"

class PrefsRequest(BaseModel):
    session_id: str = "default"
    language: Optional[str] = None   # en | hi | hinglish | auto
    level: Optional[str] = None      # beginner | intermediate | advanced | auto
    slow_mode: Optional[bool] = None
    animation_enabled: Optional[bool] = None

class CriticRequest(BaseModel):
    code: str
    error: str
    session_id: str = "default"

class AnimateRequest(BaseModel):
    topic: str
    caption: str
    session_id: str = "default"


def _error_steps(msg: str) -> list[dict]:
    """Create a fallback error step for the frontend."""
    return [{"type": "write", "style": "note", "content": msg, "duration": 8000}]


def _parse_candidate(text: str) -> dict | list[dict] | None:
    text = text.strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        try:
            return ast.literal_eval(text)
        except Exception:
            return None


VALID_STEP_TYPES = {"speak", "write", "animate", "draw", "ask", "quiz", "pause", "experiment"}

def _coerce_step(data) -> dict | None:
    """Only return valid teaching steps that have a recognized 'type'."""
    if isinstance(data, dict):
        # Must have a 'type' field that is a recognized step type
        if data.get("type") in VALID_STEP_TYPES:
            return data
    if isinstance(data, list) and data and isinstance(data[0], dict):
        if data[0].get("type") in VALID_STEP_TYPES:
            return data[0]
    return None


def _extract_streamed_steps(buffer: str) -> tuple[list[dict], str]:
    """Extract any complete step objects from a streamed JSON buffer."""
    steps: list[dict] = []
    in_string = False
    escape = False
    started = False
    brace_depth = 0
    obj_start: int | None = None
    last_consumed = 0

    for i, ch in enumerate(buffer):
        if not started:
            if ch == "[":
                started = True
                last_consumed = i + 1
            continue

        if obj_start is None:
            if ch == "{":
                obj_start = i
                brace_depth = 1
                in_string = False
                escape = False
            continue

        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
        elif ch == "{":
            brace_depth += 1
        elif ch == "}":
            brace_depth -= 1
            if brace_depth == 0 and obj_start is not None:
                candidate = buffer[obj_start : i + 1]
                parsed = _coerce_step(_parse_candidate(candidate))
                if parsed is not None:
                    steps.append(parsed)
                last_consumed = i + 1
                obj_start = None

    remainder = buffer[last_consumed:]
    return steps, remainder


# ── Health ─────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    from app.core.config import settings
    router = get_router()
    return {
        "status": "ok",
        "model": "gemini",
        "provider": settings.ai_provider,
    }


@router.get("/model/check")
async def check_model():
    from app.core.ai_provider import get_provider
    p = get_provider()
    if hasattr(p, "check_model"):
        ok = await p.check_model()
        from app.core.config import settings
        return {"available": ok, "model": settings.ollama_model}
    return {"available": True, "model": "unknown"}


# ── Topic suggestions ─────────────────────────────────────────────────

@router.get("/topics")
async def get_topics():
    return {
        "beginner": [
            "Motion and Kinematics", "Force and Newton's Laws",
            "Energy and Work", "Gravity and Free Fall",
            "Waves and Sound", "Electricity Basics",
            "Magnetism", "Light and Optics",
        ],
        "intermediate": [
            "Rotational Mechanics", "Thermodynamics",
            "Electromagnetic Induction", "Fluid Mechanics",
            "Oscillations and SHM", "Ray Optics",
            "Electric Circuits", "Pressure and Buoyancy",
        ],
        "advanced": [
            "Special Relativity", "Quantum Mechanics",
            "Particle Physics", "Nuclear Physics",
            "General Relativity", "Quantum Field Theory",
            "Astrophysics", "Condensed Matter Physics",
        ],
    }


# ── Teach (non-streaming) ─────────────────────────────────────────────

@router.post("/teach")
async def teach(req: TeachRequest):
    try:
        orch = get_orchestrator(req.session_id)
        steps = await orch.teach(req.topic, req.student_message)
        return {"steps": steps, "topic": req.topic, "session_id": req.session_id}
    except Exception as e:
        print(f"[NOVA] /teach error: {e}")
        traceback.print_exc()
        return {
            "steps": _error_steps(
                f"⚠️ NOVA encountered an error while preparing the lesson.\n\n"
                f"Error: {type(e).__name__}: {str(e)[:200]}\n\n"
                f"This usually happens when Ollama is still loading the model. "
                f"Try again in a moment."
            ),
            "topic": req.topic,
            "session_id": req.session_id,
        }


# ── Teach (SSE streaming) ─────────────────────────────────────────────

@router.post("/teach/stream")
async def teach_stream(req: TeachRequest):
    orch = get_orchestrator(req.session_id)

    async def gen():
        raw = ""
        buffer = ""
        emitted = 0
        try:
            async for chunk in orch.stream_teach(req.topic, req.student_message):
                raw += chunk
                buffer += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                steps, buffer = _extract_streamed_steps(buffer)
                for step in steps:
                    emitted += 1
                    yield f"data: {json.dumps({'step': step, 'index': emitted - 1})}\n\n"
            steps = _parse(raw)
            yield f"data: {json.dumps({'done': True, 'steps': steps, 'topic': req.topic})}\n\n"
        except Exception as e:
            print(f"[NOVA] /teach/stream error: {e}")
            steps = _error_steps(f"⚠️ Streaming error: {type(e).__name__}")
            yield f"data: {json.dumps({'done': True, 'steps': steps})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── Ask AI (non-streaming) ────────────────────────────────────────────

@router.post("/ask")
async def ask(req: AskRequest):
    try:
        orch = get_orchestrator(req.session_id)
        steps = await orch.respond(req.message, req.image)
        return {"steps": steps, "session_id": req.session_id}
    except Exception as e:
        print(f"[NOVA] /ask error: {e}")
        traceback.print_exc()
        return {
            "steps": _error_steps(
                f"⚠️ NOVA could not process your question.\n\n"
                f"Error: {type(e).__name__}: {str(e)[:200]}\n\n"
                f"Please try again."
            ),
            "session_id": req.session_id,
        }


# ── Ask AI (SSE streaming) ────────────────────────────────────────────

@router.post("/ask/stream")
async def ask_stream(req: AskRequest):
    orch = get_orchestrator(req.session_id)

    async def gen():
        raw = ""
        buffer = ""
        emitted = 0
        try:
            async for chunk in orch.stream_respond(req.message, req.image):
                raw += chunk
                buffer += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                steps, buffer = _extract_streamed_steps(buffer)
                for step in steps:
                    emitted += 1
                    yield f"data: {json.dumps({'step': step, 'index': emitted - 1})}\n\n"
            steps = _parse(raw)
            yield f"data: {json.dumps({'done': True, 'steps': steps})}\n\n"
        except Exception as e:
            print(f"[NOVA] /ask/stream error: {e}")
            steps = _error_steps(f"⚠️ Streaming error: {type(e).__name__}")
            yield f"data: {json.dumps({'done': True, 'steps': steps})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── Continue lesson ───────────────────────────────────────────────────

@router.post("/continue")
async def continue_lesson(session_id: str = Query("default")):
    try:
        orch = get_orchestrator(session_id)
        steps = await orch.continue_lesson()
        return {"steps": steps}
    except Exception as e:
        print(f"[NOVA] /continue error: {e}")
        return {"steps": _error_steps(f"⚠️ Could not continue: {type(e).__name__}")}


# ── Quiz ──────────────────────────────────────────────────────────────

@router.post("/quiz")
async def quiz(session_id: str = Query("default"), topic: str = Query("")):
    try:
        orch = get_orchestrator(session_id)
        steps = await orch.generate_quiz(topic)
        return {"steps": steps}
    except Exception as e:
        print(f"[NOVA] /quiz error: {e}")
        return {"steps": _error_steps(f"⚠️ Could not generate quiz: {type(e).__name__}")}


# ── Experiment ────────────────────────────────────────────────────────

@router.post("/experiment")
async def experiment(session_id: str = Query("default"), concept: str = Query("")):
    try:
        orch = get_orchestrator(session_id)
        steps = await orch.generate_experiment(concept)
        return {"steps": steps}
    except Exception as e:
        print(f"[NOVA] /experiment error: {e}")
        return {"steps": _error_steps(f"⚠️ Could not design experiment: {type(e).__name__}")}


# ── Animator Agent ────────────────────────────────────────────────────

@router.post("/animate")
async def animate_code(req: AnimateRequest):
    try:
        from app.services.ai_router import get_router
        from app.services.orchestrator import ANIMATOR_PROMPT, RAG_TEMPLATES
        ai = get_router()
        
        system = ANIMATOR_PROMPT
        search = (req.topic + " " + req.caption).lower()
        if search:
            for key, data in RAG_TEMPLATES.items():
                if any(kw in search for kw in data.get("keywords", [])):
                    system += f"\n\n[RAG VERIFIED TEMPLATE]: You MUST use this exact JavaScript physics code for the {key} animation. Modify variables only if requested.\n```javascript\n{data['template']}\n```"
                    break

        msg = f"Generate the 3D physics JavaScript code for this scenario:\nTopic: {req.topic}\nCaption: {req.caption}"
        
        res = await ai.complete(
            task="animate",
            topic=req.topic,
            student_msg=msg,
            image=None,
            messages=[],
            system=system
        )
        
        code = res.text.strip()
        if code.startswith("```javascript"):
            code = code[13:]
        elif code.startswith("```js"):
            code = code[5:]
        if code.endswith("```"):
            code = code[:-3]
            
        return {"code": code.strip()}
    except Exception as e:
        print(f"[NOVA] /animate error: {e}")
        return {"code": ""}


# ── Critic Agent ──────────────────────────────────────────────────────

@router.post("/critic")
async def critic(req: CriticRequest):
    try:
        from app.services.ai_router import get_router
        ai = get_router()
        system = "You are the NOVA Code Critic. The following PhysicsSDK/Three.js code crashed. Fix the error and return ONLY the raw javascript code. Do not use markdown blocks, just return pure code."
        msg = f"Code:\n{req.code}\n\nError:\n{req.error}\n\nFix it."
        
        res = await ai.complete(
            task="critic",
            topic="code_fix",
            student_msg=msg,
            image=None,
            messages=[],
            system=system
        )
        
        fixed_code = res.text.strip()
        if fixed_code.startswith("```javascript"):
            fixed_code = fixed_code[13:]
        elif fixed_code.startswith("```js"):
            fixed_code = fixed_code[5:]
        if fixed_code.endswith("```"):
            fixed_code = fixed_code[:-3]
            
        return {"fixed_code": fixed_code.strip()}
    except Exception as e:
        print(f"[NOVA] /critic error: {e}")
        return {"fixed_code": req.code}

# ── Session preferences ───────────────────────────────────────────────

@router.post("/prefs")
async def set_prefs(req: PrefsRequest):
    MemoryStore.update_prefs(
        req.session_id,
        language=req.language,
        level=req.level,
        slow_mode=req.slow_mode,
        animation_enabled=req.animation_enabled,
    )
    return {"ok": True}


@router.get("/memory/{session_id}")
async def get_memory(session_id: str):
    mem = MemoryStore.get(session_id)
    return {
        "topic": mem.current_topic,
        "history": mem.topic_history,
        "weak_areas": mem.weak_areas,
        "strong_areas": mem.strong_areas,
        "language": mem.language,
        "level": mem.student_level,
        "interactions": len(mem.interaction_log),
    }


# ── Reset session ─────────────────────────────────────────────────────

@router.delete("/session/{session_id}")
async def reset_session(session_id: str):
    reset_orchestrator(session_id)
    return {"ok": True, "session_id": session_id}
