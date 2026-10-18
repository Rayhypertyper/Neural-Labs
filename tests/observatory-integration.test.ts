import { describe, it, expect } from "vitest";
import { INITIAL_DATA, INITIAL_TRAINING, PRESETS } from "../src/game/catalog";
import {
  comparisonSummary,
  describeChanges,
  describeDeploymentChanges,
  explainEpoch,
  networkLayers,
  projectTraining,
} from "../src/game/observatory";
import type { ExperimentConfig } from "../src/types/game";
const fixture = (): ExperimentConfig => ({
  dataset: {
    ...structuredClone(INITIAL_DATA),
    samples: 8000,
    diversity: 0.86,
    night: 0.18,
    labelQuality: 0.985,
  },
  architecture: structuredClone(PRESETS[1]),
  training: structuredClone(INITIAL_TRAINING),
});
describe("Training Observatory integration", () => {
  it("keeps planning pure and reports missing data", () => {
    const c = fixture();
    const snapshot = structuredClone(c);
    const first = projectTraining(c);
    expect(first.result?.epochs.length).toBe(30);
    expect(projectTraining(c)).toEqual(first);
    expect(c).toEqual(snapshot);
    c.dataset.samples = 0;
    expect(projectTraining(c).issues.length).toBeGreaterThan(0);
  });
  it("describes multiple decision changes with useful explanations", () => {
    const a = fixture(),
      b = structuredClone(a);
    b.training.lr = 0.01;
    b.dataset.augmentation.brightness = 25;
    b.dataset.resolution = 256;
    const changes = describeChanges(a, b);
    expect(changes.some((x) => x.title === "Learning rate")).toBe(true);
    expect(changes.some((x) => x.title === "Brightness")).toBe(true);
    expect(changes.every((x) => x.explanation.length > 20)).toBe(true);
    expect(a.training.lr).toBe(0.001);
  });
  it("follows actual spatial dimensions and output classes", () => {
    const c = fixture();
    const nodes = networkLayers(c);
    expect(nodes[0].shape).toBe("128 × 128 × 3");
    expect(nodes.find((x) => x.kind === "pool")?.shape).toBe("64 × 64 × 32");
    expect(nodes.at(-1)?.shape).toBe("2 features");
    c.architecture.layers[0].stride = 2;
    expect(networkLayers(c)[1].shape).toBe("64 × 64 × 32");
  });
  it("compares footprint changes and distinguishes deployment from training", () => {
    const a = fixture(),
      b = structuredClone(a);
    b.training.batch = 128;
    expect(comparisonSummary(a, b).memory).toBeGreaterThan(0);
    const d = {
      quantization: "FP32",
      pruning: 0,
      hardware: "Lab GPU",
      batch: 1,
    };
    const changes = describeDeploymentChanges(d, {
      ...d,
      quantization: "INT8",
    });
    expect(changes).toHaveLength(1);
    expect(changes[0].explanation).toContain("after training");
  });
  it("explains a selected epoch and the untrained state", () => {
    const result = projectTraining(fixture()).result!;
    expect(explainEpoch(result.epochs, 0)).toContain(
      "no measured training metrics",
    );
    expect(explainEpoch(result.epochs, 2)).toContain("this epoch");
  });
});
