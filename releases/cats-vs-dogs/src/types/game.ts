export type Stage =
  "overview" | "data" | "model" | "training" | "results" | "deploy";
export type Explanation = {
  title: string;
  purpose: string;
  pros: string[];
  cons: string[];
  bestWhen?: string[];
  affects: string[];
  typicalRange?: string;
  advancedNotes?: string;
};
export type ContextHint = {
  severity: "info" | "warning" | "positive";
  message: string;
};
export type AugmentationKey =
  "flip" | "crop" | "rotation" | "brightness" | "contrast" | "noise" | "jitter";
export type DatasetConfig = {
  packages: Record<string, number>;
  samples: number;
  catRatio: number;
  labelQuality: number;
  diversity: number;
  night: number;
  duplicates: number;
  corrupted: number;
  cleaned: string[];
  split: { train: number; validation: number; test: number };
  resolution: number;
  normalization: string;
  sampling: string;
  augmentation: Record<AugmentationKey, number>;
};
export type LayerKind =
  "conv" | "relu" | "pool" | "norm" | "dropout" | "global" | "dense";
export type Layer = {
  id: string;
  kind: LayerKind;
  width: number;
  kernel: number;
  stride: number;
  padding: string;
  activation: string;
};
export type ArchitectureConfig = { name: string; layers: Layer[] };
export type TrainingConfig = {
  optimizer: string;
  lr: number;
  batch: number;
  epochs: number;
  loss: string;
  dropout: number;
  weightDecay: number;
  momentum: number;
  scheduler: string;
  warmup: number;
  earlyStopping: boolean;
  patience: number;
  clip: number;
  seed: number;
  hardware: string;
};
export type ExperimentConfig = {
  dataset: DatasetConfig;
  architecture: ArchitectureConfig;
  training: TrainingConfig;
};
export type Estimate = {
  parameters: number;
  vram: number;
  size: number;
  latency: number;
  cost: number;
  epochCost: number;
};
export type EpochMetrics = {
  epoch: number;
  trainAccuracy: number;
  validationAccuracy: number;
  trainLoss: number;
  validationLoss: number;
  utilization: number;
  lr: number;
};
export type Metrics = {
  trainAccuracy: number;
  validationAccuracy: number;
  precision: number;
  recall: number;
  f1: number;
  catRecall: number;
  dogRecall: number;
};
export type Checkpoint = {
  id: string;
  epoch: number;
  accuracy: number;
  trainAccuracy: number;
};
export type TrainingResult = {
  epochs: EpochMetrics[];
  checkpoints: Checkpoint[];
  finalMetrics: Metrics;
  trainingCost: number;
  status: "completed" | "early-stopped" | "diverged" | "oom" | "stopped";
  message?: string;
};
export type Experiment = {
  id: number;
  config: ExperimentConfig;
  estimate: Estimate;
  result: TrainingResult;
  createdAt: string;
};
export type DeploymentConfig = {
  quantization: string;
  pruning: number;
  hardware: string;
  batch: number;
};
export type Evaluation = {
  accuracy: number;
  robustness: number;
  latency: number;
  size: number;
  score: number;
  reward: number;
  passed: boolean;
  slices: { name: string; accuracy: number }[];
  components: { name: string; score: number; max: number }[];
};
