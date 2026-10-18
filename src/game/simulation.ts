import { HARDWARE } from "./catalog";
import { estimate, validateArchitecture, validateDataset } from "./economy";
import type {
  Checkpoint,
  EpochMetrics,
  ExperimentConfig,
  Metrics,
  TrainingResult,
} from "../types/game";
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function metricsFor(
  m: EpochMetrics,
  d: ExperimentConfig["dataset"],
): Metrics {
  const ratio = clamp(d.catRatio, 0.01, 0.99);
  const imbalance =
    Math.abs(ratio - 0.5) * 18 * (d.sampling === "Class balanced" ? 0.35 : 1);
  let catRecall = clamp(
    m.validationAccuracy + (ratio >= 0.5 ? 1 : -1) * imbalance * (1 - ratio),
    1,
    99.8,
  );
  const dogRecall = clamp(
    (m.validationAccuracy - ratio * catRecall) / (1 - ratio),
    1,
    99.8,
  );
  catRecall = clamp(
    (m.validationAccuracy - (1 - ratio) * dogRecall) / ratio,
    1,
    99.8,
  );
  const catsCorrect = (ratio * catRecall) / 100,
    dogsCorrect = ((1 - ratio) * dogRecall) / 100;
  const catPrecision =
    catsCorrect / (catsCorrect + (1 - ratio) * (1 - dogRecall / 100));
  const dogPrecision =
    dogsCorrect / (dogsCorrect + ratio * (1 - catRecall / 100));
  const precision = (catPrecision + dogPrecision) * 50,
    recall = (catRecall + dogRecall) / 2;
  return {
    trainAccuracy: m.trainAccuracy,
    validationAccuracy: m.validationAccuracy,
    precision,
    recall,
    f1: (2 * precision * recall) / (precision + recall),
    catRecall,
    dogRecall,
  };
}
export function augmentationStrength(config: ExperimentConfig) {
  const a = config.dataset.augmentation;
  return (
    (a.flip / 100) * 0.16 +
    (a.crop / 50) * 0.2 +
    (a.rotation / 90) * 0.16 +
    (a.brightness / 60) * 0.19 +
    (a.contrast / 60) * 0.1 +
    (a.noise / 40) * 0.09 +
    (a.jitter / 60) * 0.1
  );
}
export function simulateTraining(
  config: ExperimentConfig,
  seed = config.training.seed,
): TrainingResult {
  const { dataset: d, architecture: a, training: t } = config;
  const est = estimate(config);
  const random = seededRandom(seed);
  const empty: Metrics = {
    trainAccuracy: 0,
    validationAccuracy: 0,
    precision: 0,
    recall: 0,
    f1: 0,
    catRecall: 0,
    dogRecall: 0,
  };
  const fail = (
    status: "oom" | "diverged",
    message: string,
  ): TrainingResult => ({
    epochs: [],
    checkpoints: [],
    finalMetrics: empty,
    trainingCost: status === "oom" ? 0 : Math.ceil(est.epochCost),
    status,
    message,
  });
  const errors = [...validateDataset(d), ...validateArchitecture(a)];
  if (errors.length) throw new Error(errors.join(" "));
  const hardware =
    HARDWARE[t.hardware as keyof typeof HARDWARE] ?? HARDWARE["Lab GPU · 8 GB"];
  if (est.vram > hardware.vram)
    return fail(
      "oom",
      `This configuration needs ${est.vram.toFixed(1)} GB, but your GPU has ${hardware.vram} GB. The failed allocation costs $0.`,
    );
  const aug = augmentationStrength(config);
  const params = est.parameters;
  const capacity = Math.log2(1 + params / 12000);
  const n =
    ((d.samples * d.split.train) / 100) * (1 - d.duplicates - d.corrupted);
  const dataScore = clamp(Math.log10(Math.max(100, n) / 1000) * 5, -6, 8);
  const oversize = clamp((params / Math.max(1, n) - 25) / 120, 0, 1);
  const imbalance =
    Math.abs(0.5 - d.catRatio) * (d.sampling === "Class balanced" ? 0.4 : 1);
  const noisy = 1 - d.labelQuality + d.corrupted * 0.5;
  const regularization =
    t.dropout * 0.4 +
    Math.sqrt(t.weightDecay) * 2 +
    a.layers.filter((l) => l.kind === "norm").length * 0.03 +
    a.layers.filter((l) => l.kind === "dropout").length * t.dropout * 0.12;
  const underRegularized = Math.max(0, oversize - regularization - aug * 0.7);
  const excessAug = Math.max(0, aug - 0.58) * 8;
  const dropoutPenalty = Math.max(0, t.dropout - 0.45) * 32;
  const effectiveLR = t.lr * (t.optimizer.startsWith("SGD") ? 0.12 : 1);
  const lrQuality = Math.exp(-Math.abs(Math.log10(effectiveLR / 0.001)) * 0.9);
  const instability =
    clamp((Math.log10(t.lr) + 1.5) * 0.9, 0, 1) * (t.clip > 0 ? 0.35 : 1);
  const resolutionBonus = Math.log2(d.resolution / 128) * 0.8;
  const sigmoidPenalty =
    a.layers.filter((l) => l.kind === "relu" && l.activation === "Sigmoid")
      .length * 1.2;
  const trainCeiling = clamp(
    89 +
      capacity * 2.4 -
      noisy * 11 -
      t.dropout * 8 -
      dropoutPenalty -
      aug * 3 -
      excessAug -
      (t.loss === "MSE" ? 4 : 0) -
      sigmoidPenalty,
    55,
    99.9,
  );
  const valCeiling = clamp(
    77 +
      capacity * 1.05 +
      dataScore +
      d.diversity * 9 +
      aug * 5 +
      regularization * 3 -
      noisy * 17 -
      imbalance * 7 -
      dropoutPenalty -
      underRegularized * 9 -
      (t.loss === "MSE" ? 5 : 0) -
      (Math.max(0, t.batch - 128) / 128) * 0.55 -
      excessAug +
      resolutionBonus -
      sigmoidPenalty * 0.5,
    51,
    98.2,
  );
  const normalizationSpeed =
    d.normalization === "None"
      ? 0.65
      : d.normalization === "Scale to 0–1"
        ? 0.9
        : 1;
  const speed =
    ((0.004 + lrQuality * 0.326) *
      normalizationSpeed *
      (t.optimizer === "SGD" ? 0.65 : 1) *
      (t.optimizer === "SGD + Momentum" ? 0.6 + t.momentum * 0.35 : 1) *
      (t.optimizer === "RMSProp" ? 0.92 : 1) *
      (t.loss === "MSE" ? 0.78 : 1) *
      (1 + a.layers.filter((l) => l.activation === "GELU").length * 0.015)) /
    (1 + aug * 0.4 + t.dropout * 0.4);
  const epochs: EpochMetrics[] = [];
  const checkpoints: Checkpoint[] = [];
  let best = 0,
    badEpochs = 0;
  let status: TrainingResult["status"] = "completed";
  for (let e = 1; e <= t.epochs; e++) {
    let rate = t.lr;
    if (t.scheduler === "Step decay") rate *= 0.5 ** Math.floor(e / 10);
    if (t.scheduler === "Cosine decay")
      rate *= 0.5 * (1 + Math.cos((Math.PI * e) / t.epochs)) + 0.02;
    if (t.scheduler === "Plateau reduction" && badEpochs > 2) rate *= 0.4;
    if (t.warmup > 0 && e <= t.warmup) rate *= e / t.warmup;
    const warmupSlow = t.warmup > 0 ? Math.min(e, t.warmup) * 0.35 : 0;
    const progress = 1 - Math.exp(-speed * Math.max(0.1, e - warmupSlow));
    const overfit =
      underRegularized * Math.max(0, e - 9) * 0.43 +
      noisy * Math.max(0, e - 12) * 0.12;
    const schedulerBonus =
      t.scheduler === "None" ? 0 : Math.min(1.4, e * 0.055);
    const jitter =
      (random() - 0.5) *
      (1.25 + instability * 10) *
      (1 / Math.sqrt(Math.max(0.2, d.split.validation / 15)));
    const divergent =
      t.lr > (t.optimizer.startsWith("SGD") ? 0.6 : 0.12) && t.clip === 0;
    const trainAccuracy = clamp(
      50 + (trainCeiling - 50) * progress + jitter * 0.3 - instability * 9,
      1,
      99.9,
    );
    const validationAccuracy = clamp(
      50 +
        (valCeiling - 50) * progress -
        overfit +
        jitter +
        schedulerBonus -
        instability * 15,
      1,
      99.7,
    );
    const lossScale = divergent ? Math.exp(e * 0.7) : 1;
    const m: EpochMetrics = {
      epoch: e,
      trainAccuracy: divergent
        ? Math.max(1, trainAccuracy - e * 3)
        : trainAccuracy,
      validationAccuracy: divergent
        ? Math.max(1, validationAccuracy - e * 3)
        : validationAccuracy,
      trainLoss: Math.max(
        0.015,
        -Math.log(trainAccuracy / 100) * 1.65 * lossScale,
      ),
      validationLoss: Math.max(
        0.02,
        -Math.log(validationAccuracy / 100) * 1.8 * lossScale,
      ),
      utilization: clamp(65 + t.batch / 8 + random() * 5, 60, 99),
      lr: rate,
    };
    epochs.push(m);
    checkpoints.push({
      id: `epoch-${e}`,
      epoch: e,
      accuracy: m.validationAccuracy,
      trainAccuracy: m.trainAccuracy,
    });
    if (m.validationAccuracy > best + 0.05) {
      best = m.validationAccuracy;
      badEpochs = 0;
    } else badEpochs++;
    if (divergent && e >= 5) {
      status = "diverged";
      break;
    }
    if (t.earlyStopping && badEpochs >= t.patience) {
      status = "early-stopped";
      break;
    }
  }
  return {
    epochs,
    checkpoints,
    finalMetrics: metricsFor(epochs.at(-1)!, d),
    trainingCost: Math.ceil(est.epochCost * epochs.length),
    status,
    message:
      status === "diverged"
        ? "Loss grew rapidly and training diverged. Completed checkpoints are preserved."
        : status === "early-stopped"
          ? `Early stopping triggered after ${t.patience} epochs without improvement.`
          : undefined,
  };
}
