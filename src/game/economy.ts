import { HARDWARE } from "./catalog";
import type {
  DatasetConfig,
  ExperimentConfig,
  Estimate,
  ArchitectureConfig,
} from "../types/game";
export function spend(budget: number, cost: number) {
  if (!Number.isFinite(cost) || cost < 0)
    throw new Error("Cost must be a non-negative number.");
  if (cost > budget)
    throw new Error("There is not enough budget for this action.");
  return Math.round((budget - cost) * 100) / 100;
}
export function parameterCount(a: ArchitectureConfig) {
  let channels = 3,
    total = 0;
  for (const l of a.layers) {
    if (l.kind === "conv") {
      total += (l.kernel * l.kernel * channels + 1) * l.width;
      channels = l.width;
    }
    if (l.kind === "norm") total += channels * 2;
    if (l.kind === "dense") {
      total += (channels + 1) * l.width;
      channels = l.width;
    }
  }
  return total;
}
export function validateArchitecture(a: ArchitectureConfig) {
  const errors: string[] = [];
  if (!a.layers.some((l) => l.kind === "conv"))
    errors.push("Add at least one convolutional layer.");
  if (a.layers.at(-1)?.kind !== "dense" || a.layers.at(-1)?.width !== 2)
    errors.push("End with a Dense output layer with 2 outputs.");
  if (!a.layers.some((l) => l.kind === "global"))
    errors.push("Add global pooling before the output.");
  if (
    a.layers.some(
      (l) => !Number.isFinite(l.width) || l.width < 1 || l.width > 1024,
    )
  )
    errors.push("Layer widths must be between 1 and 1,024.");
  if (
    a.layers.findIndex((l) => l.kind === "global") >
    a.layers.findIndex((l) => l.kind === "dense")
  )
    errors.push("Place global pooling before the dense layer.");
  return errors;
}
export function validateDataset(d: DatasetConfig) {
  const errors: string[] = [];
  if (d.samples < 100) errors.push("Acquire a dataset before training.");
  if (Object.values(d.split).some((v) => !Number.isFinite(v) || v < 5))
    errors.push("Each split needs at least 5%.");
  if (Object.values(d.split).reduce((a, b) => a + b, 0) !== 100)
    errors.push("Train, validation and test must add up to 100%.");
  return errors;
}
export function estimate(config: ExperimentConfig): Estimate {
  const { architecture: a, dataset: d, training: t } = config;
  const parameters = parameterCount(a);
  let spatial = 1,
    convWidth = 0;
  for (const l of a.layers) {
    if (l.kind === "conv") {
      spatial /= l.stride ** 2;
      if (l.padding === "Valid") spatial *= 0.92;
      convWidth += l.width * Math.max(0.12, spatial);
    }
    if (l.kind === "pool") spatial /= 4;
  }
  const resolutionFactor = (d.resolution / 128) ** 2;
  const aug = Object.values(d.augmentation).reduce((s, n) => s + n, 0) / 100;
  const hardware =
    HARDWARE[t.hardware as keyof typeof HARDWARE] ?? HARDWARE["Lab GPU · 8 GB"];
  const size = (parameters * 4) / 1e6;
  const vram =
    0.45 +
    (parameters * 16) / 1e9 +
    convWidth * t.batch * resolutionFactor * 0.00012;
  const epochCost = Math.max(
    3,
    ((d.samples * d.split.train) / 100 / 6000) *
      (4 + convWidth / 22) *
      resolutionFactor *
      (1 + aug * 0.2) *
      (64 / t.batch) ** 0.15 *
      hardware.multiplier,
  );
  return {
    parameters,
    vram,
    size,
    latency: 1.8 + parameters / 160000 + convWidth * 0.008 * resolutionFactor,
    cost: Math.ceil(epochCost * t.epochs),
    epochCost,
  };
}
