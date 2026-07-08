# ⚛️ NOVA Physics — AI Physics Teacher

> An infinite AI Physics Teacher powered by `qwen2.5:14b` (Ollama).
> Teaches from F=ma to Quantum Field Theory. No hardcoded lessons. No textbooks. Just AI.

---

## 🚀 Quick Start

### 1. Pull the AI Model
```bash
ollama pull qwen2.5:14b
```

### 2. Start the Backend
```bash
cd physics-ai-teacher/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Start the Frontend
```bash
cd physics-ai-teacher/frontend
npm install
npm run dev
```

### 4. Open the App
→ http://localhost:3000

---

## 🧠 Architecture

```
physics-ai-teacher/
├── backend/                     # FastAPI + Python
│   └── app/
│       ├── core/
│       │   ├── config.py        # Settings (model, provider, CORS)
│       │   └── ai_provider.py   # Ollama / OpenAI / Anthropic
│       ├── services/
│       │   ├── orchestrator.py  # AI Teaching Brain (NOVA)
│       │   └── memory.py        # Per-session AI memory
│       ├── api/routes.py        # All API endpoints
│       └── main.py              # FastAPI app
│
└── frontend/                    # Next.js + TypeScript + Tailwind
    └── src/
        ├── app/                 # Next.js app router
        ├── components/
        │   ├── Whiteboard.tsx   # AI Whiteboard Engine
        │   ├── AnimationPanel.tsx # Physics Simulation Canvas
        │   ├── LessonView.tsx   # Fullscreen Classroom
        │   ├── TeacherControls.tsx # Fixed Bottom Control Bar
        │   ├── QuestionOverlay.tsx # Ask/Quiz Overlay
        │   ├── HomeView.tsx     # Topic Selection Home
        │   └── LoadingView.tsx  # Loading Screen
        ├── hooks/
        │   └── useTeacher.ts    # AI Playback Engine
        ├── store/
        │   └── physics.store.ts # Zustand Global State
        └── lib/
            ├── api.ts           # Backend API client + SSE streaming
            └── animations.ts    # Canvas Physics Animator
```

---

## 🎯 AI Core Features

| Feature | Description |
|---------|-------------|
| **AI Orchestrator** | NOVA decides what to teach, when, and how |
| **Live Whiteboard** | All formulas, derivations, notes appear here |
| **Physics Animator** | 11 animation types: projectile, wave, quantum, orbital… |
| **AI Memory** | Tracks weak areas, language, history per session |
| **Adaptive Pacing** | Slow mode, question pauses, repeat loops |
| **Multilingual** | English · Hindi · Hinglish |
| **Quiz Engine** | AI-generated MCQ and open-answer quizzes |
| **Experiments** | AI designs virtual lab experiments |
| **SSE Streaming** | Real-time lesson streaming via Server-Sent Events |

---

## 💬 Student Commands

Say anything to NOVA:
- `"Explain again"` → re-explains from a different angle
- `"Show animation"` → triggers physics simulation
- `"Give an example"` → concrete real-world example
- `"Slow down"` → more steps, slower pacing
- `"Draw a diagram"` → diagram on whiteboard
- `"मुझे हिंदी में समझाओ"` → switches to Hindi
- `"Quiz me"` → generates a quiz
- `"Show experiment"` → virtual lab experiment
- `"What's next?"` → continues to next concept

---

## 🔧 Configuration

**Backend** (`backend/.env`):
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:14b
AI_PROVIDER=ollama   # ollama | openai | anthropic
CORS_ORIGINS=http://localhost:3000
```

**To use OpenAI:**
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/teach` | Start a new lesson |
| POST | `/api/v1/teach/stream` | SSE streaming lesson |
| POST | `/api/v1/ask` | Student question → AI response |
| POST | `/api/v1/ask/stream` | SSE streaming ask |
| POST | `/api/v1/continue` | Continue current lesson |
| POST | `/api/v1/quiz` | Generate quiz |
| POST | `/api/v1/experiment` | Design virtual experiment |
| POST | `/api/v1/prefs` | Update language/level/mode |
| GET  | `/api/v1/memory/{id}` | View session memory |
| GET  | `/api/v1/topics` | Get topic suggestions |

---

## 🎮 Controls

| Button | Action |
|--------|--------|
| ▶ / ⏸ | Play / Pause lesson |
| 🔁 | Replay from start |
| 🐢 | Slow mode (2.2× timing) |
| 🎬 | Toggle animations |
| 🧪 | Generate experiment |
| 📝 | Generate quiz |
| ➡ | Load more content |
| ⚡ | Quick command menu |
| 🎤 | Microphone (voice ready) |
