import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  INITIAL_DATA,
  INITIAL_TRAINING,
  PACKAGES,
  PRESETS,
  OPTION_SETS,
  OPTIMIZERS,
  BATCHES,
  LOSSES,
  SCHEDULERS,
  AUGMENTATIONS,
  CLEANING,
} from "../src/game/catalog";
import {
  estimate,
  spend,
  parameterCount,
  validateArchitecture,
  validateDataset,
} from "../src/game/economy";
import { seededRandom, simulateTraining } from "../src/game/simulation";
import { deploymentEstimate, evaluateHidden } from "../src/game/scoring";
import { explanations } from "../src/game/explanations";
import { useGame, currentConfig } from "../src/store/gameStore";
import type { Experiment, ExperimentConfig } from "../src/types/game";
function config(index = 1): ExperimentConfig {
  const p = PACKAGES[index];
  return {
    dataset: {
      ...structuredClone(INITIAL_DATA),
      samples: p.samples,
      catRatio: p.catRatio,
      labelQuality: p.quality,
      diversity: p.diversity,
      night: p.night,
      duplicates: p.duplicates,
      corrupted: p.corrupted,
    },
    architecture: structuredClone(PRESETS[1]),
    training: structuredClone(INITIAL_TRAINING),
  };
}
function experiment(c = config()): Experiment {
  return {
    id: 1,
    config: c,
    result: simulateTraining(c),
    estimate: estimate(c),
    createdAt: "2026-10-17T00:00:00.000Z",
  };
}
describe("economy and footprint", () => {
  it("spends exactly and refuses overdrafts or negative charges", () => {
    expect(spend(10000, 1000)).toBe(9000);
    expect(() => spend(20, 21)).toThrow();
    expect(() => spend(20, -1)).toThrow();
    expect(() => spend(20, NaN)).toThrow();
  });
  it("calculates convolution weights and biases", () => {
    const a = structuredClone(PRESETS[0]);
    const convs = a.layers.filter((l) => l.kind === "conv");
    expect(convs.map((x) => x.width)).toEqual([16, 32]);
    expect(parameterCount(a)).toBe(
      (3 * 3 * 3 + 1) * 16 + (3 * 3 * 16 + 1) * 32 + (32 + 1) * 2,
    );
  });
  it("increases costs and memory with resolution", () => {
    const a = config();
    const b = structuredClone(a);
    b.dataset.resolution = 256;
    expect(estimate(b).vram).toBeGreaterThan(estimate(a).vram);
    expect(estimate(b).cost).toBeGreaterThan(estimate(a).cost);
  });
  it("increases memory with batch size and charges cloud premium", () => {
    const a = config(),
      b = structuredClone(a);
    b.training.batch = 256;
    expect(estimate(b).vram).toBeGreaterThan(estimate(a).vram);
    b.training.batch = 64;
    b.training.hardware = "Cloud GPU · 16 GB";
    expect(estimate(b).epochCost / estimate(a).epochCost).toBeCloseTo(1.8);
  });
  it("reduces activation memory when strides downsample", () => {
    const a = config(),
      b = structuredClone(a);
    b.architecture.layers[0].stride = 2;
    expect(estimate(b).vram).toBeLessThan(estimate(a).vram);
  });
  it("requires a two-class output and valid layer order", () => {
    const a = config().architecture;
    expect(validateArchitecture(a)).toEqual([]);
    a.layers.at(-1)!.width = 3;
    expect(validateArchitecture(a).length).toBeGreaterThan(0);
  });
  it("requires acquired samples and a 100% split", () => {
    expect(validateDataset(INITIAL_DATA).length).toBeGreaterThan(0);
    const d = config().dataset;
    expect(validateDataset(d)).toEqual([]);
    d.split.train = 80;
    expect(validateDataset(d).length).toBeGreaterThan(0);
  });
});
describe("deterministic learning simulator", () => {
  it("reproduces every epoch for identical inputs and seed", () => {
    const c = config();
    expect(simulateTraining(c)).toEqual(simulateTraining(c));
  });
  it("changes curve noise when the seed changes", () => {
    expect(simulateTraining(config(), 1).epochs).not.toEqual(
      simulateTraining(config(), 2).epochs,
    );
  });
  it("uses a reproducible random generator", () => {
    const a = seededRandom(42),
      b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("generates evolving plausible curves and one checkpoint per completed epoch", () => {
    const r = simulateTraining(config());
    expect(r.epochs).toHaveLength(30);
    expect(r.checkpoints).toHaveLength(30);
    expect(r.epochs.at(-1)!.trainLoss).toBeLessThan(r.epochs[0].trainLoss);
    expect(r.epochs.at(-1)!.validationAccuracy).toBeGreaterThan(
      r.epochs[0].validationAccuracy,
    );
    for (const e of r.epochs) {
      expect(e.validationAccuracy).toBeGreaterThan(0);
      expect(e.validationAccuracy).toBeLessThan(100);
    }
  });
  it("rewards clean diverse data over noisy internet data", () => {
    expect(
      simulateTraining(config(1)).finalMetrics.validationAccuracy,
    ).toBeGreaterThan(
      simulateTraining(config(0)).finalMetrics.validationAccuracy,
    );
  });
  it("penalizes extreme dropout and insufficient learning rate", () => {
    const a = config();
    a.training.dropout = 0.8;
    expect(simulateTraining(a).finalMetrics.trainAccuracy).toBeLessThan(
      simulateTraining(config()).finalMetrics.trainAccuracy,
    );
    const b = config();
    b.training.lr = 0.000001;
    expect(simulateTraining(b).finalMetrics.validationAccuracy).toBeLessThan(
      80,
    );
  });
  it("classification loss outperforms MSE", () => {
    const a = config();
    a.training.loss = "MSE";
    expect(simulateTraining(a).finalMetrics.validationAccuracy).toBeLessThan(
      simulateTraining(config()).finalMetrics.validationAccuracy,
    );
  });
  it("models normalization and minority-class sampling choices", () => {
    const a = config();
    a.dataset.normalization = "None";
    expect(simulateTraining(a).epochs[4].validationAccuracy).toBeLessThan(
      simulateTraining(config()).epochs[4].validationAccuracy,
    );
    const b = config(0);
    const before = simulateTraining(b).finalMetrics.dogRecall;
    b.dataset.sampling = "Class balanced";
    expect(simulateTraining(b).finalMetrics.dogRecall).toBeGreaterThan(before);
  });
  it("diverges with a deliberately excessive learning rate", () => {
    const c = config();
    c.training.lr = 1;
    const r = simulateTraining(c);
    expect(r.status).toBe("diverged");
    expect(r.epochs.at(-1)!.trainLoss).toBeGreaterThan(r.epochs[0].trainLoss);
    expect(r.checkpoints).toHaveLength(5);
  });
  it("fails GPU allocation without charging compute", () => {
    const c = config();
    c.architecture = structuredClone(PRESETS[3]);
    c.training.batch = 512;
    c.dataset.resolution = 256;
    const r = simulateTraining(c);
    expect(r.status).toBe("oom");
    expect(r.trainingCost).toBe(0);
  });
  it("early stopping saves epochs and cost", () => {
    const c = config(0);
    c.architecture = structuredClone(PRESETS[3]);
    c.training.dropout = 0;
    c.training.epochs = 100;
    c.training.earlyStopping = true;
    c.training.patience = 3;
    const r = simulateTraining(c);
    expect(r.status).toBe("early-stopped");
    expect(r.epochs.length).toBeLessThan(100);
    expect(r.trainingCost).toBeLessThan(estimate(c).cost);
  });
});
describe("hidden scoring and contract balance", () => {
  it("evaluates deterministically on a different distribution", () => {
    const e = experiment();
    const cp = e.result.checkpoints.at(-1)!;
    const d = {
      quantization: "FP32",
      pruning: 0,
      hardware: "Lab GPU",
      batch: 1,
    };
    const r = evaluateHidden(e, cp, d, 5000);
    expect(r).toEqual(evaluateHidden(e, cp, d, 5000));
    expect(r.accuracy).toBeLessThan(cp.accuracy);
    expect(r.components.reduce((s, c) => s + c.score, 0)).toBe(r.score);
    expect(r.score).toBeLessThanOrEqual(10000);
  });
  it("trades compression for size, latency and accuracy", () => {
    const e = experiment();
    const cp = e.result.checkpoints.at(-1)!;
    const d = {
      quantization: "FP32",
      pruning: 0,
      hardware: "Lab GPU",
      batch: 1,
    };
    const q = { ...d, quantization: "INT8" };
    expect(deploymentEstimate(e, q).size).toBeCloseTo(
      deploymentEstimate(e, d).size / 4,
    );
    expect(evaluateHidden(e, cp, q, 5000).accuracy).toBeLessThan(
      evaluateHidden(e, cp, d, 5000).accuracy,
    );
  });
  it("has a passing strategy inside the $10,000 budget", () => {
    const c = config(2);
    c.dataset.augmentation = {
      flip: 50,
      crop: 20,
      rotation: 15,
      brightness: 25,
      contrast: 15,
      noise: 4,
      jitter: 10,
    };
    c.training.scheduler = "Cosine decay";
    const e = experiment(c);
    const cp = e.result.checkpoints.reduce((a, b) =>
      a.accuracy > b.accuracy ? a : b,
    );
    const remaining = 10000 - 7000 - e.result.trainingCost;
    const r = evaluateHidden(
      e,
      cp,
      { quantization: "FP16", pruning: 0, hardware: "Lab GPU", batch: 1 },
      remaining,
    );
    expect(remaining).toBeGreaterThan(0);
    expect(r.passed).toBe(true);
    expect(r.reward).toBeGreaterThan(0);
  });
});
describe("game lifecycle and budget accounting", () => {
  beforeEach(() => useGame.getState().reset());
  it("acquires and combines data without losing weighted quality", () => {
    useGame.getState().buy("internet");
    useGame.getState().buy("curated");
    const s = useGame.getState();
    expect(s.budget).toBe(5000);
    expect(s.dataset.samples).toBe(20000);
    expect(s.dataset.labelQuality).toBeCloseTo(
      (12000 * 0.89 + 8000 * 0.985) / 20000,
    );
  });
  it("refuses unaffordable purchases", () => {
    useGame.getState().buy("professional");
    useGame.getState().buy("curated");
    expect(useGame.getState().budget).toBe(3000);
    expect(useGame.getState().dataset.samples).toBe(20000);
  });
  it("applies paid cleaning only once until new data arrives", () => {
    useGame.getState().buy("internet");
    useGame.getState().clean("deduplicate");
    useGame.getState().clean("deduplicate");
    expect(useGame.getState().budget).toBe(8800);
    expect(useGame.getState().dataset.samples).toBe(11064);
    expect(useGame.getState().dataset.duplicates).toBe(0);
  });
  it("reserves cost, pauses playback, stops and refunds unused epochs", () => {
    useGame.getState().buy("curated");
    const before = useGame.getState().budget;
    useGame.getState().start();
    expect(useGame.getState().running).not.toBeNull();
    for (let i = 0; i < 5; i++) useGame.getState().tick();
    useGame.getState().pause();
    useGame.getState().tick();
    expect(useGame.getState().running?.cursor).toBe(5);
    useGame.getState().stop();
    const s = useGame.getState();
    expect(s.experiments[0].result.epochs).toHaveLength(5);
    expect(s.experiments[0].result.checkpoints).toHaveLength(5);
    expect(s.budget).toBe(before - s.experiments[0].result.trainingCost);
  });
  it("stores completed runs and requires an explicit checkpoint for submission", () => {
    useGame.getState().buy("curated");
    useGame.getState().start();
    for (let i = 0; i < 30; i++) useGame.getState().tick();
    expect(useGame.getState().experiments).toHaveLength(1);
    useGame.getState().submit();
    expect(useGame.getState().evaluation).toBeNull();
    useGame.getState().setCheckpoint("1:20");
    useGame.getState().submit();
    expect(useGame.getState().evaluation).not.toBeNull();
    const budget = useGame.getState().budget;
    useGame.getState().buy("internet");
    expect(useGame.getState().budget).toBe(budget);
  });
  it("keeps OOM failure in history without deducting funds", () => {
    useGame.getState().buy("internet");
    useGame.getState().setArchitecture(PRESETS[3]);
    useGame.getState().updateDataset({ resolution: 256 });
    useGame.getState().updateTraining({ batch: 512 });
    useGame.getState().start();
    expect(useGame.getState().budget).toBe(9000);
    expect(useGame.getState().experiments[0]?.result.status).toBe("oom");
  });
  it("starts a fresh editable model without resetting data, settings or completed runs", () => {
    useGame.getState().buy("curated");
    useGame.getState().start();
    while (useGame.getState().running) useGame.getState().tick();
    useGame.getState().setCheckpoint("1:20");
    const previous = useGame.getState();

    useGame.getState().newModel(PRESETS[0]);
    const s = useGame.getState();
    expect(s.architecture).toEqual(PRESETS[0]);
    expect(s.architecture).not.toBe(PRESETS[0]);
    expect(s.architecture.layers[0]).not.toBe(PRESETS[0].layers[0]);
    expect(s.experiments).toEqual(previous.experiments);
    expect(s.dataset).toEqual(previous.dataset);
    expect(s.training).toEqual(previous.training);
    expect(s.budget).toBe(previous.budget);
    expect(s.selectedCheckpoint).toBe("");
    expect(s.stage).toBe("model");
    s.setArchitecture({ ...s.architecture, name: "Custom CNN" });
    expect(useGame.getState().architecture.name).toBe("Custom CNN");
    expect(PRESETS[0].name).toBe("Tiny CNN");
  });
  it.each([false, true])(
    "saves the old run and refunds unused compute when choosing a new model (paused: %s)",
    (paused) => {
      useGame.getState().buy("curated");
      const budget = useGame.getState().budget;
      useGame.getState().start();
      for (let i = 0; i < 5; i++) useGame.getState().tick();
      if (paused) useGame.getState().pause();
      const previousConfig = useGame.getState().running!.experiment.config;

      useGame.getState().newModel(PRESETS[0]);
      const s = useGame.getState();
      const previous = s.experiments[0];
      expect(s.running).toBeNull();
      expect(s.architecture).toEqual(PRESETS[0]);
      expect(previous.config).toEqual(previousConfig);
      expect(previous.result.status).toBe("stopped");
      expect(previous.result.checkpoints).toHaveLength(5);
      expect(s.budget).toBe(budget - previous.result.trainingCost);
      expect(s.stage).toBe("model");
      s.tick();
      s.newModel(PRESETS[2]);
      expect(useGame.getState().budget).toBe(s.budget);
      expect(useGame.getState().experiments).toHaveLength(1);
      useGame.getState().start();
      expect(useGame.getState().running?.experiment.id).toBe(2);
      expect(
        useGame.getState().running?.experiment.config.architecture,
      ).toEqual(PRESETS[2]);
    },
  );
  it("refunds the whole reservation when switching before the first epoch", () => {
    useGame.getState().buy("curated");
    const budget = useGame.getState().budget;
    useGame.getState().start();
    useGame.getState().newModel(PRESETS[0]);
    const s = useGame.getState();
    expect(s.budget).toBe(budget);
    expect(s.experiments[0].result.trainingCost).toBe(0);
    expect(s.experiments[0].result.checkpoints).toEqual([]);
  });
  it("keeps the previous evaluation and unlocks another model after submission", () => {
    useGame.getState().buy("curated");
    useGame.getState().start();
    while (useGame.getState().running) useGame.getState().tick();
    useGame.getState().setCheckpoint("1:20");
    useGame.getState().submit();
    const previous = useGame.getState();
    expect(previous.evaluation).not.toBeNull();

    useGame.getState().newModel(PRESETS[0]);
    const s = useGame.getState();
    expect(s.evaluation).toBeNull();
    expect(s.selectedCheckpoint).toBe("");
    expect(s.budget).toBe(previous.budget);
    expect(s.experiments[0].result).toEqual(previous.experiments[0].result);
    expect(s.experiments[0].evaluations).toEqual([
      {
        epoch: 20,
        deployment: previous.deployment,
        result: previous.evaluation,
      },
    ]);
    s.newModel(PRESETS[2]);
    expect(useGame.getState().experiments[0].evaluations).toHaveLength(1);
    useGame.getState().updateTraining({ lr: 0.002 });
    useGame.getState().start();
    expect(useGame.getState().running?.experiment.id).toBe(2);
    expect(useGame.getState().running?.experiment.config.training.lr).toBe(
      0.002,
    );
  });
});
describe("educational coverage", () => {
  it("covers every statically referenced UI help key", () => {
    const files = [
      "src/App.tsx",
      ...readdirSync("src/components")
        .filter((f) => f.endsWith(".tsx"))
        .map((f) => `src/components/${f}`),
    ];
    const keys = new Set<string>();
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/(?:help|id)="([\w.]+)"/g)) keys.add(m[1]);
    }
    for (const key of keys) expect(explanations[key], key).toBeDefined();
  });
  it("covers every package, preset, augmentation and selectable value", () => {
    const keys = [
      ...PACKAGES.map((x) => `package.${x.id}`),
      ...PRESETS.map((x) => `preset.${x.name}`),
      ...AUGMENTATIONS.map((x) => `aug.${x.id}`),
      ...CLEANING.map((x) => `clean.${x.id}`),
      ...OPTIMIZERS.map((x) => `optimizer.${x}`),
      ...BATCHES.map((x) => `batch.${x}`),
      ...SCHEDULERS.map((x) => `schedule.${x}`),
      ...LOSSES.map((x) => `loss.${x}`),
      ...Object.entries(OPTION_SETS).flatMap(([key, values]) =>
        values.map((v) => `${key}.${v}`),
      ),
    ];
    for (const key of keys) expect(explanations[key], key).toBeDefined();
  });
  it("requires purpose, advantages, disadvantages and effects in every entry", () => {
    for (const [key, e] of Object.entries(explanations)) {
      expect(e.title.length, key).toBeGreaterThan(0);
      expect(e.purpose.length, key).toBeGreaterThan(12);
      expect(e.pros.length, key).toBeGreaterThan(0);
      expect(e.cons.length, key).toBeGreaterThan(0);
      expect(e.affects.length, key).toBeGreaterThan(0);
    }
  });
});
