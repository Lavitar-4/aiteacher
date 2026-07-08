import { TeachingStep } from "@/store/physics.store";

const DEFAULT_PARAMS: Record<string, Record<string, unknown>> = {
  projectile: { angle: 45, velocity: 20, gravity: 9.8 },
  pendulum: { length: 1.5, angle: 30 },
  wave: { frequency: 2, amplitude: 60, type: "transverse" },
  orbital: { eccentricity: 0.2 },
  electric_field: {
    charges: [
      { x: 0.35, y: 0.5, charge: 1 },
      { x: 0.65, y: 0.5, charge: -1 },
    ],
  },
  collision: { m1: 2, m2: 1, v1: 5, v2: 0, type: "elastic" },
  spring: { k: 10, mass: 1, amplitude: 0.2 },
  quantum_wave: { n: 2, type: "particle_in_box" },
  graph: { fn: "Math.sin(x)", xRange: [-6.28, 6.28], label: "y = sin(x)" },
  gravitational_field: {},
  doppler: { frequency: 2 },
  atom: { element: "hydrogen", shell: 1 },
  nuclear: { type: "fission", nucleus: "uranium" },
  solar_blast: { scenario: "solar_blast", lightDelayMinutes: 8.3 },
  gravity_change: { scenario: "gravity_change", gravityFactor: 2 },
  black_hole: { scenario: "black_hole", lensing: true },
  custom: {}, // Dynamic parameters passed by AI
  code: {}, // Dynamic code passed by AI
  "3d_code": {}, // 3D WebGL code passed by AI
};

const TYPE_ALIASES: Record<string, string> = {
  projectile_motion: "projectile",
  shm: "spring",
  oscillation: "pendulum",
  oscillations: "pendulum",
  sound: "wave",
  light: "wave",
  electricity: "electric_field",
  electric: "electric_field",
  gravity: "gravitational_field",
  gravitation: "gravitational_field",
  orbit: "orbital",
  quantum: "quantum_wave",
  quantum_wavefunction: "quantum_wave",
  nucleus: "nuclear",
  sun_blast: "solar_blast",
  solar_explosion: "solar_blast",
  supernova: "solar_blast",
  gravity_double: "gravity_change",
  blackhole: "black_hole",
};

const KEYWORD_TYPES: Array<[string[], string]> = [
  [["sun blast", "sun explode", "solar blast", "solar explosion", "supernova", "suraj phat", "suraj blast", "सूरज", "sun me blast"], "solar_blast"],
  [["gravity double", "gravity band", "gravity stop", "no gravity", "zero gravity", "gravity change", "गुरुत्वाकर्षण"], "gravity_change"],
  [["black hole", "blackhole", "event horizon", "singularity"], "black_hole"],
  [["projectile", "throw", "trajectory", "parabola", "cannon", "free fall"], "projectile"],
  [["pendulum", "swing"], "pendulum"],
  [["wave", "sound", "light", "interference", "diffraction"], "wave"],
  [["doppler"], "doppler"],
  [["orbit", "planet", "satellite", "kepler"], "orbital"],
  [["electric", "charge", "field", "coulomb"], "electric_field"],
  [["collision", "momentum", "elastic", "inelastic"], "collision"],
  [["spring", "shm", "oscillation", "simple harmonic"], "spring"],
  [["quantum", "wavefunction", "particle in box"], "quantum_wave"],
  [["gravity", "gravitation", "gravitational"], "gravitational_field"],
  [["atom", "atomic", "electron", "bohr"], "atom"],
  [["nuclear", "nucleus", "fission", "fusion", "radioactive"], "nuclear"],
];

export function normalizeAnimationType(type?: string) {
  const cleaned = (type || "").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  const normalized = TYPE_ALIASES[cleaned] || cleaned;
  return DEFAULT_PARAMS[normalized] ? normalized : "wave";
}

export function wantsAnimation(message: string) {
  const m = message.toLowerCase();
  return [
    "animation",
    "animate",
    "visualize",
    "visualise",
    "simulation",
    "simulator",
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
    "देखना",
  ].some((word) => m.includes(word));
}

export function inferAnimationType(message: string, topic = "") {
  const text = `${message} ${topic}`.toLowerCase();
  const found = KEYWORD_TYPES.find(([keywords]) => keywords.some((word) => text.includes(word)));
  return found ? found[1] : "wave";
}

export function inferAnimationTypeFromText(textInput: string, topic = "") {
  const text = `${textInput} ${topic}`.toLowerCase();
  const found = KEYWORD_TYPES.find(([keywords]) => keywords.some((word) => text.includes(word)));
  return found ? found[1] : "wave";
}

export function inferAnimationTypeFromSteps(steps: TeachingStep[], topic = "") {
  const text = steps
    .map((step) => [
      step.content,
      step.caption,
      step.question,
      step.name,
      step.setup,
      step.expected_observation,
      ...(step.steps || []),
    ].filter(Boolean).join(" "))
    .join(" ");
  return inferAnimationTypeFromText(text, topic);
}

export function normalizeTeachingSteps(steps: TeachingStep[]) {
  return steps.map((step) => {
    if (step.type !== "animate") return step;

    const type = normalizeAnimationType(step.animation_type);
    
    // Safely extract code/content from the root step object if AI misplaced it
    const codeStr = step.params?.code || (step as any).code || step.content || "";
    
    return {
      ...step,
      animation_type: type,
      params: { 
        ...DEFAULT_PARAMS[type], 
        ...(step.params || {}),
        code: codeStr
      },
      caption: step.caption || `Interactive ${type.replaceAll("_", " ")} simulation`,
      duration: step.duration ?? 7000,
    };
  });
}

export function buildAnimationStep(message: string, topic = ""): TeachingStep {
  const type = inferAnimationTypeFromText(message, topic);
  return {
    type: "animate",
    animation_type: type,
    params: DEFAULT_PARAMS[type],
    caption: `Showing ${type.replaceAll("_", " ")} animation`,
    duration: 9000,
  };
}

export function buildAnimationStepFromText(text: string, topic = ""): TeachingStep {
  return buildAnimationStep(text, topic);
}

export function ensureRequestedAnimation(
  steps: TeachingStep[],
  message: string,
  topic = "",
) {
  const normalized = normalizeTeachingSteps(steps);
  if (normalized.some((step) => step.type === "animate")) {
    return normalized;
  }

  const inferred = inferAnimationTypeFromSteps(normalized, topic);
  if (inferred === "wave") {
    return normalized;
  }

  return [
    {
      type: "animate",
      animation_type: inferred,
      params: DEFAULT_PARAMS[inferred],
      caption: `Showing ${inferred.replaceAll("_", " ")} animation`,
      duration: 9000,
    },
    {
      type: "speak" as const,
      content: "Animation right panel me chal rahi hai. Pehle visual me kya change ho raha hai dekho, phir main usi ko simple physics idea se connect karunga.",
      duration: 3500,
    },
    ...normalized,
  ];
}
