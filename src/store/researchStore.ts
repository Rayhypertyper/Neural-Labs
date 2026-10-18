import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CONTRACTS,
  GPUS,
  MODEL_PRESETS,
  SOURCES,
  contractFor,
  initialLLM,
  params,
} from "../game/researchCatalog";
import {
  applyTreatment,
  checkpointAt,
  estimateServing,
  evaluateLLM,
  projectLLM,
  rewardAccuracy,
  simulateLLM,
  sourceCost,
  treatmentCost,
} from "../game/llmSimulation";
import type {
  ContractId,
  LLMConfig,
  LLMRun,
  ResearchPage,
  ResearchProject,
  Treatment,
} from "../types/research";
import { researchStorage } from "./researchStorage";

export const makeProject = (contract: ContractId): ResearchProject => ({
  contract,
  budget: contractFor(contract).budget,
  config: initialLLM(contract),
  page: "overview",
  version: 1,
  runs: [],
  running: null,
  checkpoints: [],
  selected: "",
  actions: [],
  report: null,
  deployed: false,
  days: [],
  feedbackBank: 0,
  history: [],
});
type Recovery = "rollback" | "clip" | "continue";
type ResearchState = {
  active: ContractId;
  board: boolean;
  mode: "Open research" | "Career";
  completed: ContractId[];
  projects: Partial<Record<ContractId, ResearchProject>>;
  notice: string | null;
  speed: number;
  showBoard: () => void;
  closeBoard: () => void;
  selectContract: (id: ContractId) => void;
  setMode: (mode: "Open research" | "Career") => void;
  recordTutorial: () => void;
  page: (page: ResearchPage) => void;
  configure: <K extends keyof LLMConfig>(
    key: K,
    patch: Partial<LLMConfig[K]>,
  ) => void;
  preset: (name: string) => void;
  acquire: (id: string) => void;
  starterCorpus: () => void;
  start: () => void;
  tick: (single?: boolean, contract?: ContractId) => void;
  tickAll: () => void;
  pause: () => void;
  stop: () => void;
  recover: (choice: Recovery) => void;
  selectCheckpoint: (id: string) => void;
  treatment: (type: Treatment) => void;
  evaluate: () => void;
  deploy: () => void;
  nextDay: () => void;
  nextVersion: () => void;
  setSpeed: (speed: number) => void;
  dismiss: () => void;
  resetProject: () => void;
};
export const selectedModel = (p: ResearchProject) =>
  p.checkpoints.find((cp) => cp.id === p.selected);
function finishRun(
  p: ResearchProject,
  run: LLMRun,
  stopped: boolean,
): ResearchProject {
  const spent = Math.ceil((run.reserved * run.cursor) / run.metrics.length);
  const finished: LLMRun = {
    ...run,
    status: stopped ? "stopped" : "completed",
    paused: false,
    charged: spent + run.charged,
  };
  const cp = run.cursor > 0 ? checkpointAt(run, run.cursor) : null;
  const checkpoints =
    cp && !p.checkpoints.some((x) => x.id === cp.id)
      ? [...p.checkpoints, cp]
      : p.checkpoints;
  return {
    ...p,
    budget: p.budget + run.reserved - spent,
    running: null,
    runs: [...p.runs, finished].slice(-20),
    checkpoints: checkpoints.slice(-80),
    report: null,
  };
}
export const useResearch = create<ResearchState>()(
  persist(
    (set, get) => {
      const current = () => {
        const s = get();
        return s.projects[s.active];
      };
      const update = (
        fn: (p: ResearchProject) => ResearchProject,
        notice?: string,
        contract?: ContractId,
      ) => {
        const s = get(),
          id = contract ?? s.active,
          p = s.projects[id];
        if (!p) return;
        set({
          projects: { ...s.projects, [id]: fn(p) },
          ...(notice && id === s.active ? { notice } : {}),
        });
      };
      const say = (notice: string) => set({ notice });
      return {
        active: "cats",
        board: false,
        mode: "Open research",
        completed: [],
        projects: {},
        notice: null,
        speed: 2,
        showBoard: () => set({ board: true }),
        closeBoard: () => set({ board: false }),
        setMode: (mode) => set({ mode }),
        recordTutorial: () => {
          if (!get().completed.includes("cats"))
            set((s) => ({ completed: [...s.completed, "cats"] }));
        },
        selectContract: (id) => {
          const s = get(),
            index = CONTRACTS.findIndex((c) => c.id === id);
          if (
            s.mode === "Career" &&
            index > 0 &&
            !s.completed.includes(CONTRACTS[index - 1].id)
          )
            return say(
              "Complete the preceding contract, or switch to Open research to explore freely.",
            );
          set({
            active: id,
            board: false,
            projects:
              id === "cats" || id === "digits" || s.projects[id]
                ? s.projects
                : { ...s.projects, [id]: makeProject(id) },
            notice: null,
          });
        },
        page: (page) => update((p) => ({ ...p, page })),
        configure: (key, patch) => {
          const p = current();
          if (!p || p.running || (p.deployed && key !== "production")) return;
          update((p) => ({
            ...p,
            config: { ...p.config, [key]: { ...p.config[key], ...patch } },
            report: key === "production" ? p.report : null,
          }));
        },
        preset: (name) => {
          const preset = MODEL_PRESETS.find((p) => p.name === name),
            p = current();
          if (!preset || !p || p.running || p.deployed) return;
          get().configure("architecture", {
            ...preset,
            preset: name,
            attention: preset.kvHeads === preset.heads ? "MHA" : "GQA",
          });
        },
        acquire: (id) => {
          const p = current(),
            source = SOURCES.find((s) => s.id === id);
          if (
            !p ||
            !source ||
            p.running ||
            p.deployed ||
            p.config.data.acquired.includes(id)
          )
            return;
          const cost = sourceCost(p.contract, source.cost);
          if (cost > p.budget)
            return say("Not enough research budget for this corpus license.");
          update(
            (p) => ({
              ...p,
              budget: p.budget - cost,
              config: {
                ...p.config,
                data: {
                  ...p.config.data,
                  acquired: [...p.config.data.acquired, id],
                },
              },
              report: null,
            }),
            `${source.name} acquired. You can now sample it in your training mixture.`,
          );
        },
        starterCorpus: () => {
          const p = current();
          if (!p || p.running || p.deployed) return;
          const needed = SOURCES.filter(
            (s) =>
              (p.config.data.mixture[s.id] ?? 0) > 0 &&
              !p.config.data.acquired.includes(s.id),
          );
          const cost = needed.reduce(
            (n, s) => n + sourceCost(p.contract, s.cost),
            0,
          );
          if (cost > p.budget)
            return say(
              "The selected mixture exceeds your acquisition budget. Adjust the mixture first.",
            );
          if (!needed.length)
            return say("Every source in this mixture is already acquired.");
          update(
            (p) => ({
              ...p,
              budget: p.budget - cost,
              config: {
                ...p.config,
                data: {
                  ...p.config.data,
                  acquired: [
                    ...p.config.data.acquired,
                    ...needed.map((s) => s.id),
                  ],
                },
              },
              report: null,
            }),
            "Sources for your current mixture acquired. Inspect cleaning and tokenization before training.",
          );
        },
        start: () => {
          const p = current();
          if (!p || p.running || p.deployed) return;
          const e = projectLLM(p.config, p.contract);
          if (e.issues.length) return say(e.issues[0]);
          if (e.cost > p.budget)
            return say(
              "This run exceeds the remaining budget. Reduce tokens or model size.",
            );
          const next = Math.max(0, ...p.runs.map((r) => r.id)) + 1;
          const run = simulateLLM(p.config, p.contract, next);
          update(
            (p) => ({
              ...p,
              budget: p.budget - run.reserved,
              running: run,
              page: "compute",
              report: null,
            }),
            "Compute reserved. Playback tracks simulated tokens and full-state checkpoints.",
          );
        },
        tickAll: () => {
          for (const id of Object.keys(get().projects) as ContractId[])
            if (get().projects[id]?.running) get().tick(false, id);
        },
        tick: (single, contract) => {
          const p = get().projects[contract ?? get().active],
            run = p?.running;
          if (
            !p ||
            !run ||
            (run.paused && !single) ||
            (run.event && !run.eventResolved && run.cursor >= run.event.at)
          )
            return;
          const cursor = Math.min(run.metrics.length, run.cursor + 1);
          const next = { ...run, cursor };
          const eventPending =
            next.event && !next.eventResolved && cursor === next.event.at;
          if (eventPending) next.paused = true;
          update(
            (p) => {
              const interval = Math.max(
                1,
                Math.round(
                  (run.config.training.checkpointEvery / 100) *
                    run.metrics.length,
                ),
              );
              const checkpoints =
                cursor % interval === 0 && !eventPending
                  ? [...p.checkpoints, checkpointAt(next, cursor)]
                      .filter(
                        (cp, k, arr) =>
                          arr.findIndex((x) => x.id === cp.id) === k,
                      )
                      .slice(-80)
                  : p.checkpoints;
              const nextProject = { ...p, running: next, checkpoints };
              return cursor === run.metrics.length
                ? finishRun(nextProject, next, false)
                : nextProject;
            },
            eventPending
              ? next.event!.title
              : cursor === run.metrics.length
                ? "Pretraining complete. Select a checkpoint to evaluate or post-train."
                : undefined,
            contract,
          );
        },
        pause: () =>
          update((p) =>
            p.running
              ? { ...p, running: { ...p.running, paused: !p.running.paused } }
              : p,
          ),
        stop: () => {
          const p = current();
          if (!p?.running) return;
          update(
            (p) => finishRun(p, p.running!, true),
            "Run stopped. Unused compute returned; completed checkpoints are preserved.",
          );
        },
        recover: (choice) => {
          const p = current(),
            r = p?.running;
          if (!p || !r?.event || r.eventResolved || r.cursor < r.event.at)
            return;
          if (choice === "continue" && r.event.type === "failure")
            return say(
              "A failed node must be restored from a checkpoint before training can continue.",
            );
          const rollback = choice !== "continue";
          if (rollback && r.event.lostCost > p.budget)
            return say(
              "Not enough budget to repeat the lost compute. Stop this run to recover the unused reservation.",
            );
          update(
            (p) => {
              const run = structuredClone(p.running!);
              if (rollback) {
                const interval = Math.max(
                  1,
                  Math.round(
                    (run.config.training.checkpointEvery / 100) *
                      run.metrics.length,
                  ),
                );
                run.cursor = Math.floor(run.cursor / interval) * interval;
                if (choice === "rollback") run.config.training.lr /= 2;
                if (choice === "clip") run.config.training.clip = 1;
                if (run.event!.type === "experts")
                  run.config.architecture.balance = 0.02;
                run.charged += run.event!.lostCost;
                run.recoveries.push(
                  choice === "clip"
                    ? "Restored checkpoint and enabled clipping"
                    : "Restored full state and reduced LR",
                );
                for (let j = run.cursor; j < run.metrics.length; j++) {
                  run.metrics[j].lr *= choice === "rollback" ? 0.5 : 1;
                  if (run.metrics[j].gradNorm > 100) {
                    run.metrics[j].trainLoss =
                      run.metrics[Math.max(0, j - 1)].trainLoss;
                    run.metrics[j].valLoss = run.metrics[j].trainLoss + 0.07;
                    run.metrics[j].perplexity = Math.exp(
                      run.metrics[j].valLoss,
                    );
                    run.metrics[j].gradNorm = 1.4;
                  }
                }
              } else run.recoveries.push("Continued through instability");
              run.eventResolved = true;
              run.paused = false;
              return {
                ...p,
                budget: p.budget - (rollback ? run.event!.lostCost : 0),
                running: run,
              };
            },
            rollback
              ? "Checkpoint restored, including token position. Repeated compute charged separately."
              : "Continuing. Held-out quality will reflect unresolved instability.",
          );
        },
        selectCheckpoint: (id) => {
          const p = current();
          if (
            !p ||
            p.deployed ||
            p.running ||
            !p.checkpoints.some((c) => c.id === id)
          )
            return;
          update((p) => ({ ...p, selected: id, report: null }));
        },
        treatment: (type) => {
          const p = current();
          if (!p || p.running || p.deployed) return;
          const cp = selectedModel(p);
          if (!cp)
            return say(
              "Select a saved checkpoint in Evaluations before starting this stage.",
            );
          if (cp.treatments.includes(type))
            return say(
              "This stage is already in the selected checkpoint’s lineage. Select an earlier checkpoint to try a different configuration.",
            );
          if (type === "alignment" && !cp.treatments.includes("sft"))
            return say(
              "Apply supervised fine-tuning to this model before preference alignment.",
            );
          if (
            type === "alignment" &&
            p.config.alignment.method === "PPO" &&
            !cp.treatments.includes("reward")
          )
            return say(
              "PPO requires a trained reward model. Train one with your preference pairs first.",
            );
          if (type === "tools" && !p.config.tools.enabled.length)
            return say("Choose at least one tool to train.");
          if (type === "safety" && !p.config.safety.categories.length)
            return say("Choose at least one safety category.");
          if (
            type === "distill" &&
            (p.config.compression.student >= cp.parameters ||
              p.config.compression.teacher < cp.parameters)
          )
            return say(
              "Choose a smaller student and a teacher at least as large as the selected model.",
            );
          const cost = treatmentCost(type, p.config, cp, p.contract);
          if (cost > p.budget)
            return say(
              "This stage exceeds the remaining research budget. Reduce the dataset or choose a cheaper method.",
            );
          const result = applyTreatment(type, p.config, cp);
          const next = {
            ...structuredClone(cp),
            id: `v${p.version}-${type}-${p.actions.length + 1}`,
            scores: result.scores,
            phase: type,
            loss: result.loss,
            treatments: [...cp.treatments, type],
          };
          if (type === "synthetic")
            next.syntheticData = structuredClone(p.config.synthetic);
          if (type === "reward") next.rewardQuality = rewardAccuracy(p.config);
          if (type === "safety")
            next.safetyCategories = [...p.config.safety.categories];
          if (type === "tools") next.enabledTools = [...p.config.tools.enabled];
          if (type === "distill") {
            next.parameters = p.config.compression.student;
            next.activeParameters = p.config.compression.student;
          }
          const config = structuredClone(p.config);
          if (type === "reward")
            config.preference.rewardAccuracy = rewardAccuracy(config);
          update(
            (p) => ({
              ...p,
              budget: p.budget - cost,
              config,
              checkpoints: [...p.checkpoints, next].slice(-80),
              selected: next.id,
              report: null,
              actions: [
                ...p.actions,
                {
                  id: next.id,
                  type,
                  checkpoint: cp.id,
                  cost,
                  detail: result.detail,
                  config: structuredClone(p.config),
                  scores: result.scores,
                },
              ],
            }),
            result.detail,
          );
        },
        evaluate: () => {
          const p = current();
          if (!p || p.running || p.deployed) return;
          const cp = selectedModel(p);
          if (!cp)
            return say(
              "Choose a checkpoint before running the hidden evaluation.",
            );
          const report = evaluateLLM(cp, p.config, p.contract, p.budget);
          update(
            (p) => ({ ...p, report }),
            report.passed
              ? "Hidden evaluation passed. Your selected release is ready to deploy."
              : "Evaluation recorded. Review the capability targets and release issues before trying another checkpoint.",
          );
        },
        deploy: () => {
          const p = current();
          if (!p || p.running || p.deployed) return;
          if (!p.report?.passed || p.report.selected !== p.selected)
            return say(
              "Pass the hidden evaluation with this checkpoint and serving configuration first.",
            );
          update(
            (p) => ({ ...p, deployed: true, page: "production" }),
            `Model v${p.version} deployed to simulated traffic. Contract payout recorded separately from research funds.`,
          );
          if (!get().completed.includes(p.contract))
            set((s) => ({ completed: [...s.completed, p.contract] }));
        },
        nextDay: () => {
          const p = current(),
            cp = p && selectedModel(p);
          if (!p?.deployed || !cp || !p.report) return;
          const c = p.config,
            e = estimateServing(cp, c),
            requests = c.production.requests;
          if (e.issues.length) return say(e.issues[0]);
          const served = Math.floor(Math.min(requests, e.requestsCapacity));
          if (e.dailyCost > p.budget)
            return say(
              "Insufficient operating funds for another simulated day. Start a new contract or release a more economical model before deployment.",
            );
          const consented = c.production.feedback === "Opt-in feedback";
          const feedback = consented
            ? Math.floor(((served * c.production.sample) / 100) * 0.08)
            : 0;
          const day = {
            day: (p.days.at(-1)?.day ?? 0) + 1,
            version: p.version,
            requests,
            served,
            users: Math.round(served * 0.65),
            p95: e.p95,
            hallucination: (100 - p.report.scores.factuality) * 0.22,
            violations: (100 - p.report.scores.safety) * 0.012,
            toolFailures: (100 - p.report.scores.tools) * 0.13,
            cost: e.dailyCost,
            revenue:
              (served *
                (c.production.inputTokens * c.serving.priceIn +
                  c.production.outputTokens * c.serving.priceOut)) /
              1e6,
            feedback,
            consented,
          };
          update(
            (p) => ({
              ...p,
              budget: p.budget - day.cost + day.revenue,
              days: [...p.days, day].slice(-90),
              feedbackBank: p.feedbackBank + feedback,
            }),
            `Day ${day.day}: ${served.toLocaleString()} requests served, ${feedback.toLocaleString()} opt-in examples collected.`,
          );
        },
        nextVersion: () => {
          const p = current(),
            cp = p && selectedModel(p);
          if (!p?.deployed || !cp || !p.report) return;
          if (!p.feedbackBank)
            return say(
              "Collect opt-in production feedback before opening the next model generation.",
            );
          const inherited = {
            ...structuredClone(cp),
            id: `v${p.version + 1}-base`,
            phase: `Inherited v${p.version}`,
            treatments: [],
          };
          update(
            (p) => ({
              ...p,
              version: p.version + 1,
              config: {
                ...p.config,
                sft: {
                  ...p.config.sft,
                  conversations: Math.max(1000, p.feedbackBank),
                },
              },
              page: "post",
              checkpoints: [inherited],
              selected: inherited.id,
              actions: [],
              runs: [],
              report: null,
              deployed: false,
              history: [
                ...p.history,
                { version: p.version, report: p.report!, days: p.days },
              ],
              days: [],
              feedbackBank: 0,
            }),
            "Next generation opened with the deployed weights and opt-in feedback. Retune, evaluate, and release again.",
          );
        },
        setSpeed: (speed) => set({ speed }),
        dismiss: () => set({ notice: null }),
        resetProject: () => {
          const s = get();
          if (s.active === "cats" || s.active === "digits") return;
          set({
            projects: { ...s.projects, [s.active]: makeProject(s.active) },
            notice:
              "This contract has a fresh research budget. Other contracts are preserved.",
          });
        },
      };
    },
    { name: "neural-lab-research-v1", version: 1, storage: researchStorage },
  ),
);
