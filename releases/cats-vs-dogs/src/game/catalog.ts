import type {
  ArchitectureConfig,
  DatasetConfig,
  Layer,
  TrainingConfig,
} from "../types/game";
export const CONTRACT = {
  name: "Cats vs Dogs",
  client: "Pawprint Labs",
  budget: 10000,
  requiredAccuracy: 90,
  bonusAccuracy: 95,
  bonusLatency: 20,
  bonusSize: 50,
  reward: 5000,
};
export const PACKAGES = [
  {
    id: "internet",
    name: "Open web collection",
    subtitle: "A lot of data. A little messy.",
    cost: 1000,
    samples: 12000,
    catRatio: 0.72,
    quality: 0.89,
    diversity: 0.54,
    night: 0.06,
    duplicates: 0.078,
    corrupted: 0.026,
    tag: "Budget friendly",
    tone: "blue",
    pros: ["12,000 images for $1,000", "A broad starting point"],
    cons: ["Noisy labels and duplicates", "72% cats; few low-light scenes"],
  },
  {
    id: "curated",
    name: "Curated companions",
    subtitle: "Carefully picked. Expert labeled.",
    cost: 4000,
    samples: 8000,
    catRatio: 0.52,
    quality: 0.985,
    diversity: 0.86,
    night: 0.18,
    duplicates: 0.01,
    corrupted: 0.003,
    tag: "High quality",
    tone: "teal",
    pros: ["Clean labels and balanced classes", "Diverse environments"],
    cons: ["Higher price per image", "Only 8,000 samples"],
  },
  {
    id: "professional",
    name: "Field research archive",
    subtitle: "The world beyond the studio.",
    cost: 7000,
    samples: 20000,
    catRatio: 0.5,
    quality: 0.995,
    diversity: 0.97,
    night: 0.27,
    duplicates: 0.004,
    corrupted: 0.001,
    tag: "Professional",
    tone: "purple",
    pros: ["20,000 high-quality images", "Rare breeds and broad conditions"],
    cons: ["Uses 70% of your budget", "Leaves less room for experiments"],
  },
];
export const AUGMENTATIONS = [
  { id: "flip", name: "Horizontal flip", unit: "%", max: 100, step: 5 },
  { id: "crop", name: "Random crop", unit: "%", max: 50, step: 5 },
  { id: "rotation", name: "Rotation", unit: "°", max: 90, step: 5 },
  { id: "brightness", name: "Brightness", unit: "%", max: 60, step: 5 },
  { id: "contrast", name: "Contrast", unit: "%", max: 60, step: 5 },
  { id: "noise", name: "Gaussian noise", unit: "%", max: 40, step: 2 },
  { id: "jitter", name: "Color jitter", unit: "%", max: 60, step: 5 },
] as const;
export const OPTIMIZERS = ["SGD", "SGD + Momentum", "Adam", "AdamW", "RMSProp"];
export const BATCHES = [8, 16, 32, 64, 128, 256, 512];
export const SCHEDULERS = [
  "None",
  "Step decay",
  "Cosine decay",
  "Plateau reduction",
];
export const LOSSES = ["Cross entropy", "MSE"];
export const LAYER_NAMES = {
  conv: "Conv2D",
  relu: "Activation",
  pool: "MaxPool",
  norm: "BatchNorm",
  dropout: "Dropout",
  global: "Global pool",
  dense: "Dense",
};
export function layer(kind: Layer["kind"], width = 32, id?: string): Layer {
  return {
    id: id ?? crypto.randomUUID(),
    kind,
    width,
    kernel: 3,
    stride: 1,
    padding: "Same",
    activation: "ReLU",
  };
}
function preset(name: string, widths: number[]): ArchitectureConfig {
  return {
    name,
    layers: [
      ...widths.flatMap((w, i) => [
        layer("conv", w, `${name}-conv-${i}`),
        layer("relu", w, `${name}-relu-${i}`),
        ...(i < widths.length - 1
          ? [layer("pool", w, `${name}-pool-${i}`)]
          : []),
      ]),
      layer("global", 1, `${name}-global`),
      layer("dense", 2, `${name}-output`),
    ],
  };
}
export const PRESETS = [
  preset("Tiny CNN", [16, 32]),
  preset("Balanced CNN", [32, 64, 128]),
  preset("Deep CNN", [64, 128, 256, 256]),
  preset("Large CNN", [128, 256, 512, 512]),
];
export const INITIAL_DATA: DatasetConfig = {
  packages: {},
  samples: 0,
  catRatio: 0.5,
  labelQuality: 1,
  diversity: 0,
  night: 0,
  duplicates: 0,
  corrupted: 0,
  cleaned: [],
  split: { train: 70, validation: 15, test: 15 },
  resolution: 128,
  normalization: "Standardize",
  sampling: "Random",
  augmentation: {
    flip: 0,
    crop: 0,
    rotation: 0,
    brightness: 0,
    contrast: 0,
    noise: 0,
    jitter: 0,
  },
};
export const INITIAL_TRAINING: TrainingConfig = {
  optimizer: "Adam",
  lr: 0.001,
  batch: 64,
  epochs: 30,
  loss: "Cross entropy",
  dropout: 0.2,
  weightDecay: 0.0001,
  momentum: 0.9,
  scheduler: "None",
  warmup: 0,
  earlyStopping: false,
  patience: 5,
  clip: 0,
  seed: 42,
  hardware: "Lab GPU · 8 GB",
};
export const CLEANING = [
  {
    id: "deduplicate",
    name: "Remove duplicates",
    cost: 200,
    description: "Keep unique examples; reduce leakage.",
  },
  {
    id: "relabel",
    name: "Expert relabeling",
    cost: 900,
    description: "Correct noisy labels with a human review.",
  },
  {
    id: "rebalance",
    name: "Rebalance classes",
    cost: 350,
    description: "Collect minority examples for a 50 / 50 mix.",
  },
  {
    id: "corrupted",
    name: "Remove corrupted images",
    cost: 150,
    description: "Filter unreadable and damaged files.",
  },
];
export const HARDWARE = {
  "Lab GPU · 8 GB": { vram: 8, multiplier: 1 },
  "Cloud GPU · 16 GB": { vram: 16, multiplier: 1.8 },
};
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export const percent = (n: number) => `${n.toFixed(1)}%`;
export const OPTION_SETS: Record<string, (string | number)[]> = {
  resolution: [64, 128, 224, 256],
  normalization: ["None", "Scale to 0–1", "Standardize"],
  sampling: ["Random", "Class balanced"],
  filters: [2, 8, 16, 32, 64, 128, 256, 512],
  kernel: [1, 3, 5, 7],
  stride: [1, 2],
  padding: ["Same", "Valid"],
  activation: ["ReLU", "GELU", "Sigmoid"],
  quantization: ["FP32", "FP16", "INT8"],
  inferenceHardware: ["CPU", "Lab GPU", "Edge accelerator"],
  inferenceBatch: [1, 2, 4, 8, 16],
  hardware: Object.keys(HARDWARE),
  difficulty: ["Beginner", "Standard", "Expert"],
};
