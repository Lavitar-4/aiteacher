from __future__ import annotations


DEFAULT_PARAMS: dict[str, dict] = {
    "projectile": {"angle": 45, "velocity": 20, "gravity": 9.8},
    "pendulum": {"length": 1.5, "angle": 30},
    "wave": {"frequency": 2, "amplitude": 60, "type": "transverse"},
    "orbital": {"eccentricity": 0.2},
    "electric_field": {
        "charges": [
            {"x": 0.35, "y": 0.5, "charge": 1},
            {"x": 0.65, "y": 0.5, "charge": -1},
        ]
    },
    "collision": {"m1": 2, "m2": 1, "v1": 5, "v2": 0, "type": "elastic"},
    "spring": {"k": 10, "mass": 1, "amplitude": 0.2},
    "quantum_wave": {"n": 2, "type": "particle_in_box"},
    "graph": {"fn": "Math.sin(x)", "xRange": [-6.28, 6.28], "label": "y = sin(x)"},
    "gravitational_field": {},
    "doppler": {"frequency": 2},
    "atom": {"element": "hydrogen", "shell": 1},
    "nuclear": {"type": "fission", "nucleus": "uranium"},
    "solar_blast": {"scenario": "solar_blast", "lightDelayMinutes": 8.3},
    "gravity_change": {"scenario": "gravity_change", "gravityFactor": 2},
    "black_hole": {"scenario": "black_hole", "lensing": True},
}


KEYWORD_TYPES: list[tuple[tuple[str, ...], str]] = [
    (("sun blast", "sun explode", "solar blast", "solar explosion", "supernova", "sun me blast", "suraj phat", "suraj blast", "सूरज"), "solar_blast"),
    (("gravity double", "gravity band", "gravity stop", "no gravity", "zero gravity", "gravity change", "गुरुत्वाकर्षण"), "gravity_change"),
    (("black hole", "blackhole", "event horizon", "singularity"), "black_hole"),
    (("projectile", "throw", "trajectory", "parabola", "free fall", "girna"), "projectile"),
    (("pendulum", "swing"), "pendulum"),
    (("wave", "sound", "light", "interference", "diffraction"), "wave"),
    (("doppler",), "doppler"),
    (("orbit", "planet", "satellite", "kepler"), "orbital"),
    (("electric", "charge", "field", "coulomb"), "electric_field"),
    (("collision", "momentum", "elastic", "inelastic"), "collision"),
    (("spring", "shm", "oscillation", "simple harmonic"), "spring"),
    (("quantum", "wavefunction", "particle in box"), "quantum_wave"),
    (("gravity", "gravitation", "gravitational"), "gravitational_field"),
    (("atom", "atomic", "electron", "bohr"), "atom"),
    (("nuclear", "nucleus", "fission", "fusion", "radioactive"), "nuclear"),
]


def wants_animation(message: str) -> bool:
    text = message.lower()
    return any(
        word in text
        for word in (
            "animation",
            "animate",
            "visualize",
            "visualise",
            "simulation",
            "show",
            "what if",
            "what-if",
            "hypothetical",
            "imagine",
            "suppose",
            "maan lo",
            "man lo",
            "agar",
            "if ",
            "blast",
            "explode",
            "phat",
            "फट",
            "dikhao",
            "dikhaiye",
            "दिखाओ",
            "दिखाइए",
        )
    )


def infer_animation_type(message: str, topic: str = "") -> str:
    message_lower = message.lower()
    for keywords, animation_type in KEYWORD_TYPES:
        if any(word in message_lower for word in keywords):
            return animation_type
            
    if topic:
        topic_lower = topic.lower()
        for keywords, animation_type in KEYWORD_TYPES:
            if any(word in topic_lower for word in keywords):
                return animation_type
                
    return "wave"


def animation_step(message: str, topic: str = "") -> dict:
    animation_type = infer_animation_type(message, topic)
    return {
        "type": "animate",
        "animation_type": animation_type,
        "params": DEFAULT_PARAMS[animation_type],
        "caption": f"Showing {animation_type.replace('_', ' ')} animation",
        "duration": 10000,
    }


def _scenario_explanation(message: str, topic: str = "") -> list[dict]:
    animation_type = infer_animation_type(message, topic)
    if animation_type == "solar_blast":
        return [
            {
                "type": "speak",
                "content": "Pehle safety fact: real Sun supernova ki tarah blast nahi karega, kyunki uska mass itna zyada nahi hai. Lekin hypothetical maan ke physics samajhte hain.",
                "duration": 4500,
            },
            animation_step(message, topic),
            {
                "type": "write",
                "style": "text",
                "content": "Observe: blast ki light/heat/shock information speed of light se travel karegi.\nEarth tak sunlight aane me lagbhag 8 minute 20 second lagte hain.\nIsliye Earth ko change turant feel nahi hoga.",
                "duration": 6500,
            },
            {
                "type": "write",
                "style": "highlight",
                "content": "Key idea: space me information instant nahi jaati. Light-speed delay physics ka rule hai.",
                "duration": 4500,
            },
            {
                "type": "quiz",
                "question": "Agar Sun me sudden change ho, Earth ko uski information kab milegi?",
                "options": ["Turant", "Lagbhag 8 min 20 sec baad", "1 second baad", "1 din baad"],
                "correct": 1,
                "explanation": "Sunlight ko Sun se Earth tak aane me about 8 min 20 sec lagte hain.",
            },
        ]
    if animation_type == "gravity_change":
        return [
            animation_step(message, topic),
            {
                "type": "speak",
                "content": "Agar gravity badh jaye, falling object zyada tez accelerate karega. Weak-student shortcut: zyada gravity means har second velocity me zyada increase.",
                "duration": 4500,
            },
            {
                "type": "write",
                "style": "formula",
                "content": "$v = gt$ aur $s = \\frac{1}{2}gt^2$",
                "duration": 4500,
            },
            {
                "type": "write",
                "style": "highlight",
                "content": "g double ho to same time me fall distance bhi roughly double trend follow karta hai.",
                "duration": 4000,
            },
        ]
    if animation_type == "black_hole":
        return [
            animation_step(message, topic),
            {
                "type": "speak",
                "content": "Black hole ko drain ki tarah socho, lekin pani nahi, spacetime curve hota hai. Event horizon ke andar se light bhi bahar nahi aa pati.",
                "duration": 5000,
            },
            {
                "type": "write",
                "style": "highlight",
                "content": "Key idea: black hole object ko khinchta nahi jaise magnet; wo spacetime ko itna curve karta hai ki escape path band ho jata hai.",
                "duration": 5500,
            },
        ]
    return []


def lesson_steps(topic: str) -> list[dict]:
    animation_type = infer_animation_type(topic, topic)
    return [
        {
            "type": "speak",
            "content": f"Chalo {topic} ko bilkul basic se samajhte hain: pehle visual dekhenge, phir simple words, phir formula.",
            "duration": 3500,
        },
        {
            "type": "write",
            "style": "heading",
            "content": topic,
            "duration": 2500,
        },
        animation_step(topic, topic),
        {
            "type": "write",
            "style": "text",
            "content": "Weak-student rule:\n1. Pehle kya move/change ho raha hai dekho\n2. Phir cause pucho: kyun change ho raha hai?\n3. Phir formula ko measurement tool samjho",
            "duration": 5000,
        },
        {
            "type": "ask",
            "question": "Animation me kaunsi quantity time ke saath change hoti hui dikh rahi hai?",
            "hint": "Position, displacement, amplitude, field strength, ya energy jaisi quantity socho.",
            "expected": "Student identifies the changing physical quantity.",
        },
    ]


def answer_steps(message: str, topic: str = "") -> list[dict]:
    scenario = _scenario_explanation(message, topic)
    if scenario:
        return scenario

    steps: list[dict] = []
    if wants_animation(message):
        steps.append(animation_step(message, topic))

    focus = topic or infer_animation_type(message).replace("_", " ")
    steps.extend(
        [
            {
                "type": "speak",
                "content": f"Good question. {focus} ko weak-student style me todte hain: pehle picture, phir simple rule, phir formula.",
                "duration": 3500,
            },
            {
                "type": "write",
                "style": "text",
                "content": "1. System identify karo\n2. Changing quantity dekho\n3. Cause-effect relation likho\n4. Units check karo",
                "duration": 4500,
            },
            {
                "type": "write",
                "style": "highlight",
                "content": "Physics shortcut: visual change + measured quantity + equation = clear concept.",
                "duration": 3500,
            },
        ]
    )
    return steps
