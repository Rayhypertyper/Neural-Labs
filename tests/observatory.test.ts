import { beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { INITIAL_DATA, INITIAL_TRAINING, PRESETS } from "../src/game/catalog";
import { explanations } from "../src/game/explanations";
import {
  comparisonSummary,
  describeChanges,
  networkLayers,
  projectTraining,
} from "../src/game/observatory";
import { currentConfig, useGame } from "../src/store/gameStore";
import NetworkDiagram from "../src/components/NetworkDiagram";
import type { ExperimentConfig } from "../src/types/game";

const fixture = (): ExperimentConfig => ({
  dataset: {
    ...structuredClone(INITIAL_DATA),
    samples: 8000,
    diversity: 0.86,
    labelQuality: 0.985,
  },
  architecture: structuredClone(PRESETS[1]),
  training: structuredClone(INITIAL_TRAINING),
});

describe("what-if coverage and invalid configurations", () => {
  it("describes every training control and preserves tiny learning-rate values", () => {
    const a = fixture();
    for (const key of Object.keys(a.training) as (keyof typeof a.training)[]) {
      const b = structuredClone(a);
      Object.assign(b.training, {
        [key]:
          typeof a.training[key] === "number"
            ? Number(a.training[key]) + 0.01
            : typeof a.training[key] === "boolean"
              ? !a.training[key]
              : `changed ${a.training[key]}`,
      });
      const changes = describeChanges(a, b);
      expect(changes.length, key).toBeGreaterThan(0);
      expect(
        changes[0].help && explanations[changes[0].help],
        key,
      ).toBeDefined();
    }
    const b = structuredClone(a);
    b.training.lr = 0.000001;
    expect(describeChanges(a, b)[0].after).toBe("1.0e-6");
  });
  it("covers each augmentation and split with its specific explanation", () => {
    const a = fixture();
    for (const key of Object.keys(
      a.dataset.augmentation,
    ) as (keyof typeof a.dataset.augmentation)[]) {
      const b = structuredClone(a);
      b.dataset.augmentation[key] = 10;
      expect(describeChanges(a, b)[0].explanation).toBe(
        explanations[`aug.${key}`].purpose,
      );
    }
    for (const key of Object.keys(
      a.dataset.split,
    ) as (keyof typeof a.dataset.split)[]) {
      const b = structuredClone(a);
      b.dataset.split[key] += 5;
      expect(describeChanges(a, b)[0].explanation).toBe(
        explanations[`split.${key}`].purpose,
      );
    }
  });
  it("explains the cleaning action actually applied", () => {
    const a = fixture(),
      b = structuredClone(a);
    b.dataset.cleaned = ["relabel"];
    expect(describeChanges(a, b)[0].explanation).toBe(
      explanations["clean.relabel"].purpose,
    );
  });
  it("returns actionable setup and memory failures instead of throwing", () => {
    const a = fixture();
    a.architecture.layers.at(-1)!.width = 3;
    expect(projectTraining(a).result).toBeNull();
    expect(projectTraining(a).issues.join(" ")).toContain("2 outputs");
    const b = fixture();
    b.training.lr = NaN;
    expect(projectTraining(b).issues.join(" ")).toContain("learning rate");
    const c = fixture();
    c.dataset.resolution = 256;
    c.training.batch = 512;
    c.architecture = structuredClone(PRESETS[3]);
    expect(projectTraining(c).result?.status).toBe("oom");
    expect(projectTraining(c).issues.length).toBeGreaterThan(0);
  });
  it("reports exact simulator deltas and handles an unavailable before curve", () => {
    const a = fixture(),
      b = structuredClone(a);
    b.training.lr = 0.000001;
    const delta = comparisonSummary(a, b);
    expect(delta.accuracy).toBe(
      projectTraining(b).result!.epochs.at(-1)!.validationAccuracy -
        projectTraining(a).result!.epochs.at(-1)!.validationAccuracy,
    );
    a.dataset.samples = 0;
    expect(comparisonSummary(a, b).accuracy).toBeNull();
    expect(comparisonSummary(a, b).before).toBeNull();
  });
  it("updates diagrams for width, valid padding, stride and layer reordering", () => {
    const a = fixture();
    a.architecture.layers[0].width = 48;
    a.architecture.layers[0].padding = "Valid";
    a.architecture.layers[0].stride = 2;
    expect(networkLayers(a)[1].shape).toBe("63 × 63 × 48");
    const layers = a.architecture.layers;
    [layers[0], layers[1]] = [layers[1], layers[0]];
    expect(networkLayers(a)[1].kind).toBe("relu");
  });
  it("distinguishes hidden Dense units from the final class outputs", () => {
    const config = fixture();
    const output = config.architecture.layers.at(-1)!;
    config.architecture.layers.splice(
      -1,
      0,
      { ...output, id: "hidden-64", width: 64 },
      { ...output, id: "hidden-2", width: 2 },
    );
    expect(projectTraining(config).issues).toEqual([]);
    const markup = renderToStaticMarkup(
      createElement(NetworkDiagram, {
        config,
        active: false,
        phase: "forward",
        selected: "input",
        onSelect: () => {},
        detailed: true,
      }),
    );
    expect(markup).toContain("64 units");
    expect(markup).toContain("2 units");
    expect(markup).toContain("2 classes");
    expect(markup).not.toContain("64 classes");
    expect(markup.match(/Cat \/ Dog/g)).toHaveLength(1);
  });
});

describe("inspectable live playback", () => {
  beforeEach(() => useGame.getState().reset());
  it("steps a paused run once, keeps it paused and preserves accounting", () => {
    useGame.getState().buy("curated");
    const budget = useGame.getState().budget;
    useGame.getState().start();
    useGame.getState().pause();
    useGame.getState().tick();
    expect(useGame.getState().running?.cursor).toBe(0);
    useGame.getState().tick(true);
    expect(useGame.getState().running?.cursor).toBe(1);
    expect(useGame.getState().running?.paused).toBe(true);
    useGame.getState().stop();
    expect(useGame.getState().experiments[0].result.epochs).toHaveLength(1);
    expect(useGame.getState().budget).toBe(
      budget - useGame.getState().experiments[0].result.trainingCost,
    );
  });
  it("changes viewing speed without altering training results or funds", () => {
    useGame.getState().buy("curated");
    const s = useGame.getState(),
      expected = projectTraining(currentConfig(s));
    s.setPlaybackSpeed(4);
    expect(useGame.getState().playbackSpeed).toBe(4);
    expect(projectTraining(currentConfig(useGame.getState()))).toEqual(
      expected,
    );
    expect(useGame.getState().budget).toBe(s.budget);
    s.setPlaybackSpeed(0);
    expect(useGame.getState().playbackSpeed).toBe(4);
  });
  it("shares the inspected result with the visualization and follows checkpoint selection", () => {
    useGame.getState().buy("curated");
    for (let run = 0; run < 2; run++) {
      useGame.getState().start();
      for (let epoch = 0; epoch < 30; epoch++) useGame.getState().tick();
    }
    expect(useGame.getState().inspectedExperiment).toBe(2);
    useGame.getState().inspectExperiment(1);
    expect(useGame.getState().inspectedExperiment).toBe(1);
    useGame.getState().inspectExperiment(99);
    expect(useGame.getState().inspectedExperiment).toBe(1);
    useGame.getState().setCheckpoint("2:6");
    expect(useGame.getState().inspectedExperiment).toBe(2);
  });
});
