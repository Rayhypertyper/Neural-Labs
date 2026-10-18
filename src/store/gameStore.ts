import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CLEANING,
  INITIAL_DATA,
  INITIAL_TRAINING,
  PACKAGES,
  PRESETS,
} from "../game/catalog";
import {
  estimate,
  spend,
  validateArchitecture,
  validateDataset,
} from "../game/economy";
import { metricsFor, simulateTraining } from "../game/simulation";
import { evaluateHidden } from "../game/scoring";
import type {
  ArchitectureConfig,
  DatasetConfig,
  DeploymentConfig,
  Evaluation,
  Experiment,
  ExperimentConfig,
  Stage,
  TrainingConfig,
  TrainingResult,
} from "../types/game";
type Running = {
  experiment: Experiment;
  cursor: number;
  paused: boolean;
  reserved: number;
};
type State = {
  stage: Stage;
  budget: number;
  dataset: DatasetConfig;
  architecture: ArchitectureConfig;
  training: TrainingConfig;
  experiments: Experiment[];
  running: Running | null;
  selectedCheckpoint: string;
  inspectedExperiment: number | null;
  inspectExperiment: (id: number) => void;
  deployment: DeploymentConfig;
  evaluation: Evaluation | null;
  difficulty: string;
  notice: string | null;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  setStage: (s: Stage) => void;
  updateDataset: (d: Partial<DatasetConfig>) => void;
  updateTraining: (t: Partial<TrainingConfig>) => void;
  setArchitecture: (a: ArchitectureConfig) => void;
  newModel: (a: ArchitectureConfig) => void;
  setDeployment: (d: Partial<DeploymentConfig>) => void;
  buy: (id: string) => void;
  clean: (id: string) => void;
  start: () => void;
  tick: (singleStep?: boolean) => void;
  pause: () => void;
  stop: () => void;
  setCheckpoint: (id: string) => void;
  submit: () => void;
  reset: () => void;
  setDifficulty: (s: string) => void;
  clearNotice: () => void;
};
const initial = () => ({
  stage: "overview" as Stage,
  budget: 10000,
  dataset: structuredClone(INITIAL_DATA),
  architecture: structuredClone(PRESETS[1]),
  training: structuredClone(INITIAL_TRAINING),
  experiments: [] as Experiment[],
  running: null as Running | null,
  selectedCheckpoint: "",
  inspectedExperiment: null as number | null,
  deployment: {
    quantization: "FP32",
    pruning: 0,
    hardware: "Lab GPU",
    batch: 1,
  },
  evaluation: null as Evaluation | null,
  difficulty: "Beginner",
  notice: null as string | null,
  playbackSpeed: 1,
});
function finalize(run: Running, budget: number, stopped = false) {
  const e = run.experiment;
  const epochs = e.result.epochs.slice(0, run.cursor);
  const checkpoints = e.result.checkpoints.slice(0, run.cursor);
  const cost = Math.ceil(e.estimate.epochCost * epochs.length);
  const result: TrainingResult = {
    ...e.result,
    epochs,
    checkpoints,
    trainingCost: cost,
    status: stopped ? "stopped" : e.result.status,
    finalMetrics: epochs.length
      ? metricsFor(epochs.at(-1)!, e.config.dataset)
      : e.result.finalMetrics,
  };
  return { experiment: { ...e, result }, budget: budget + run.reserved - cost };
}
export const useGame = create<State>()(
  persist(
    (set, get) => ({
      ...initial(),
      setStage: (stage) => set({ stage }),
      updateDataset: (d) => {
        if (!get().evaluation && !get().running)
          set((s) => ({ dataset: { ...s.dataset, ...d } }));
      },
      updateTraining: (t) => {
        if (!get().evaluation && !get().running)
          set((s) => ({ training: { ...s.training, ...t } }));
      },
      setArchitecture: (architecture) => {
        if (!get().evaluation && !get().running) set({ architecture });
      },
      newModel: (architecture) => {
        const s = get();
        const [id, epoch] = s.selectedCheckpoint.split(":").map(Number);
        const evaluation = s.evaluation;
        let experiments = s.experiments;
        if (evaluation) {
          experiments = experiments.map((experiment) =>
            experiment.id === id
              ? {
                  ...experiment,
                  evaluations: [
                    ...(experiment.evaluations ?? []),
                    {
                      epoch,
                      deployment: structuredClone(s.deployment),
                      result: structuredClone(evaluation),
                    },
                  ],
                }
              : experiment,
          );
        }
        const finished = s.running ? finalize(s.running, s.budget, true) : null;
        if (finished) experiments = [...experiments, finished.experiment];
        const message = `${architecture.name} ready to edit. ${
          finished
            ? "Previous run stopped; completed checkpoints saved and unused compute refunded."
            : s.evaluation
              ? "Previous evaluation saved in Results."
              : "Previous experiments kept in Results."
        }`;
        set({
          architecture: structuredClone(architecture),
          experiments,
          budget: finished?.budget ?? s.budget,
          running: null,
          evaluation: null,
          selectedCheckpoint: "",
          inspectedExperiment: finished?.experiment.id ?? s.inspectedExperiment,
          stage: "model",
          notice: message,
        });
      },
      setDeployment: (d) => {
        if (!get().evaluation)
          set((s) => ({ deployment: { ...s.deployment, ...d } }));
      },
      buy: (id) => {
        const s = get();
        if (s.evaluation || s.running) return;
        const p = PACKAGES.find((x) => x.id === id);
        if (!p) return;
        try {
          const budget = spend(s.budget, p.cost);
          const d = s.dataset;
          const n = d.samples + p.samples;
          const merge = (a: number, b: number) =>
            (a * d.samples + b * p.samples) / n;
          set({
            budget,
            dataset: {
              ...d,
              packages: { ...d.packages, [id]: (d.packages[id] ?? 0) + 1 },
              samples: n,
              catRatio: merge(d.catRatio, p.catRatio),
              labelQuality: merge(d.labelQuality, p.quality),
              diversity: merge(d.diversity, p.diversity),
              night: merge(d.night, p.night),
              duplicates: merge(d.duplicates, p.duplicates),
              corrupted: merge(d.corrupted, p.corrupted),
              cleaned: [],
            },
            notice: `${p.samples.toLocaleString()} images acquired. ${p.name} is ready to inspect.`,
          });
        } catch (e) {
          set({ notice: (e as Error).message });
        }
      },
      clean: (id) => {
        const s = get();
        if (
          s.evaluation ||
          s.running ||
          !s.dataset.samples ||
          s.dataset.cleaned.includes(id)
        )
          return;
        const action = CLEANING.find((c) => c.id === id);
        if (!action) return;
        try {
          const budget = spend(s.budget, action.cost);
          const d = { ...s.dataset, cleaned: [...s.dataset.cleaned, id] };
          if (id === "deduplicate") {
            d.samples = Math.round(d.samples * (1 - d.duplicates));
            d.duplicates = 0;
            d.diversity = Math.min(1, d.diversity + 0.035);
          }
          if (id === "relabel") d.labelQuality = 0.997;
          if (id === "rebalance") {
            d.samples = Math.round(
              d.samples * (1 + Math.abs(0.5 - d.catRatio) * 0.25),
            );
            d.catRatio = 0.5;
          }
          if (id === "corrupted") {
            d.samples = Math.round(d.samples * (1 - d.corrupted));
            d.corrupted = 0;
          }
          set({
            budget,
            dataset: d,
            notice: `${action.name} complete. Dataset statistics updated.`,
          });
        } catch (e) {
          set({ notice: (e as Error).message });
        }
      },
      start: () => {
        const s = get();
        if (s.running || s.evaluation) return;
        const config: ExperimentConfig = structuredClone({
          dataset: s.dataset,
          architecture: s.architecture,
          training: s.training,
        });
        const errors = [
          ...validateDataset(s.dataset),
          ...validateArchitecture(s.architecture),
        ];
        if (errors.length) {
          set({ notice: errors.join(" ") });
          return;
        }
        if (
          !Number.isFinite(s.training.lr) ||
          s.training.lr < 0.000001 ||
          s.training.lr > 1 ||
          s.training.epochs < 1 ||
          s.training.epochs > 120
        ) {
          set({
            notice:
              "Choose a learning rate between 0.000001 and 1, and 1–120 epochs.",
          });
          return;
        }
        try {
          const est = estimate(config);
          const budget = spend(s.budget, est.cost);
          const result = simulateTraining(config);
          const experiment: Experiment = {
            id: s.experiments.length + 1,
            config,
            estimate: est,
            result,
            createdAt: new Date().toISOString(),
          };
          if (result.status === "oom") {
            set({
              inspectedExperiment: experiment.id,
              experiments: [...s.experiments, experiment],
              notice: result.message,
              stage: "training",
            });
            return;
          }
          set({
            budget,
            running: {
              experiment,
              cursor: 0,
              paused: false,
              reserved: est.cost,
            },
            notice: null,
          });
        } catch (e) {
          set({ notice: (e as Error).message });
        }
      },
      setPlaybackSpeed: (playbackSpeed) => {
        if ([0.25, 0.5, 1, 2, 4].includes(playbackSpeed))
          set({ playbackSpeed });
      },
      tick: (singleStep = false) => {
        const s = get();
        if (!s.running || (s.running.paused && !singleStep)) return;
        const r = { ...s.running, cursor: s.running.cursor + 1 };
        if (r.cursor >= r.experiment.result.epochs.length) {
          const { experiment, budget } = finalize(r, s.budget);
          set({
            running: null,
            experiments: [...s.experiments, experiment],
            inspectedExperiment: experiment.id,
            budget,
            stage: "results",
            notice:
              experiment.result.message ??
              `Experiment #${experiment.id} complete. ${experiment.result.checkpoints.length} checkpoints saved.`,
          });
        } else set({ running: r });
      },
      pause: () =>
        set((s) => ({
          running: s.running
            ? { ...s.running, paused: !s.running.paused }
            : null,
        })),
      stop: () => {
        const s = get();
        if (!s.running) return;
        const { experiment, budget } = finalize(s.running, s.budget, true);
        set({
          running: null,
          budget,
          experiments: [...s.experiments, experiment],
          inspectedExperiment: experiment.id,
          stage: "results",
          notice:
            "Training stopped. Completed checkpoints kept; unused compute refunded.",
        });
      },
      inspectExperiment: (id) => {
        if (get().experiments.some((e) => e.id === id))
          set({ inspectedExperiment: id });
      },
      setCheckpoint: (selectedCheckpoint) => {
        if (!get().evaluation)
          set({
            selectedCheckpoint,
            inspectedExperiment:
              Number(selectedCheckpoint.split(":")[0]) ||
              get().inspectedExperiment,
          });
      },
      submit: () => {
        const s = get();
        if (s.evaluation || s.running) return;
        const [id, epoch] = s.selectedCheckpoint.split(":").map(Number);
        const e = s.experiments.find((x) => x.id === id);
        const cp = e?.result.checkpoints.find((x) => x.epoch === epoch);
        if (!e || !cp) {
          set({ notice: "Select an experiment checkpoint to submit." });
          return;
        }
        set({ evaluation: evaluateHidden(e, cp, s.deployment, s.budget) });
      },
      reset: () => set(initial()),
      setDifficulty: (difficulty) => set({ difficulty }),
      clearNotice: () => set({ notice: null }),
    }),
    { name: "neural-lab-session-v1", version: 1 },
  ),
);
export function currentConfig(
  s: Pick<State, "dataset" | "architecture" | "training">,
): ExperimentConfig {
  return {
    dataset: s.dataset,
    architecture: s.architecture,
    training: s.training,
  };
}
