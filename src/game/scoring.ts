import type {
  Checkpoint,
  DeploymentConfig,
  Evaluation,
  Experiment,
} from "../types/game";
import { augmentationStrength } from "./simulation";
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export function deploymentEstimate(e: Experiment, d: DeploymentConfig) {
  const bits =
    d.quantization === "INT8" ? 1 : d.quantization === "FP16" ? 2 : 4;
  return {
    size: ((e.estimate.parameters * bits) / 1e6) * (1 - d.pruning / 100),
    latency:
      e.estimate.latency *
      (bits / 4) ** 0.4 *
      (1 - d.pruning / 180) *
      (d.hardware === "Edge accelerator"
        ? 0.68
        : d.hardware === "CPU"
          ? 2.8
          : 1) *
      (1 + (d.batch - 1) * 0.08),
  };
}
export function evaluateHidden(
  e: Experiment,
  checkpoint: Checkpoint,
  d: DeploymentConfig,
  budget: number,
): Evaluation {
  const data = e.config.dataset;
  const aug = augmentationStrength(e.config);
  const gap = Math.max(0, checkpoint.trainAccuracy - checkpoint.accuracy);
  const shift =
    2.8 +
    (1 - data.diversity) * 7 +
    Math.max(0, 0.2 - data.night) * 9 +
    gap * 0.16 -
    aug * 5;
  const compressionPenalty =
    (d.quantization === "INT8" ? 0.75 : d.quantization === "FP16" ? 0.1 : 0) +
    Math.max(0, d.pruning - 15) * 0.065;
  const accuracy = clamp(
    checkpoint.accuracy - Math.max(0.5, shift) - compressionPenalty,
    1,
    99,
  );
  const slices = [
    {
      name: "Low-light scenes",
      accuracy: clamp(
        accuracy -
          3 +
          (data.night - 0.15) * 20 +
          data.augmentation.brightness * 0.08,
        1,
        99,
      ),
    },
    {
      name: "Rare breeds",
      accuracy: clamp(accuracy - 2 + data.diversity * 2, 1, 99),
    },
    {
      name: "Unusual backgrounds",
      accuracy: clamp(accuracy - 2 + aug * 4, 1, 99),
    },
    {
      name: "Partially obscured",
      accuracy: clamp(accuracy - 3 + data.augmentation.crop * 0.08, 1, 99),
    },
    {
      name: "Low-quality images",
      accuracy: clamp(accuracy - 2 + data.augmentation.noise * 0.1, 1, 99),
    },
  ];
  const robustness = slices.reduce((s, x) => s + x.accuracy, 0) / slices.length;
  const { size, latency } = deploymentEstimate(e, d);
  const components = [
    { name: "Accuracy", score: Math.round((accuracy / 100) * 4000), max: 4000 },
    {
      name: "Robustness",
      score: Math.round((robustness / 100) * 2500),
      max: 2500,
    },
    {
      name: "Model efficiency",
      score: Math.round(clamp(1 - size / 100, 0.1, 1) * 1000),
      max: 1000,
    },
    {
      name: "Latency",
      score: Math.round(clamp(1 - latency / 60, 0.05, 1) * 1000),
      max: 1000,
    },
    {
      name: "Budget discipline",
      score: Math.round((budget / 10000) * 1500),
      max: 1500,
    },
  ];
  const passed = accuracy >= 90;
  return {
    accuracy,
    robustness,
    latency,
    size,
    components,
    score: components.reduce((s, x) => s + x.score, 0),
    reward: passed
      ? 5000 +
        (accuracy >= 95 ? 1500 : 0) +
        (latency <= 20 ? 500 : 0) +
        (size <= 50 ? 500 : 0)
      : 0,
    passed,
    slices,
  };
}
