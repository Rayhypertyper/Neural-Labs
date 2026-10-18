import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EpochMetrics } from "../types/game";
import {
  DIGIT_SOURCES,
  INITIAL_DIGITS,
  estimateDigits,
  hiddenDigits,
  simulateDigits,
} from "../game/digits";
import { researchStorage } from "./researchStorage";
type DigitRun = {
  id: number;
  config: typeof INITIAL_DIGITS;
  metrics: EpochMetrics[];
  cursor: number;
  paused: boolean;
  reserved: number;
  cost: number;
};
type DigitState = {
  budget: number;
  config: typeof INITIAL_DIGITS;
  acquired: string[];
  runs: DigitRun[];
  running: DigitRun | null;
  selected: number | null;
  hidden: number | null;
  notice: string;
  configure: (patch: Partial<typeof INITIAL_DIGITS>) => void;
  acquire: (id: string) => void;
  start: () => void;
  tick: () => void;
  pause: () => void;
  stop: () => void;
  select: (id: number) => void;
  evaluate: () => void;
  reset: () => void;
};
const initial = () => ({
  budget: 15000,
  config: { ...INITIAL_DIGITS },
  acquired: [] as string[],
  runs: [] as DigitRun[],
  running: null as DigitRun | null,
  selected: null as number | null,
  hidden: null as number | null,
  notice: "",
});
export const useDigits = create<DigitState>()(
  persist(
    (set, get) => ({
      ...initial(),
      configure: (patch) => {
        if (get().running || get().hidden !== null) return;
        set((s) => ({ config: { ...s.config, ...patch } }));
      },
      acquire: (id) => {
        const s = get(),
          source = DIGIT_SOURCES.find((x) => x.id === id);
        if (!source || s.running || s.hidden !== null) return;
        if (s.acquired.includes(id)) {
          set({ config: { ...s.config, source: id } });
          return;
        }
        if (source.cost > s.budget) {
          set({ notice: "Not enough budget for this dataset." });
          return;
        }
        set({
          budget: s.budget - source.cost,
          acquired: [...s.acquired, id],
          config: { ...s.config, source: id },
          notice: `${source.name} acquired. Select architecture and start a run.`,
        });
      },
      start: () => {
        const s = get(),
          e = estimateDigits(s.config);
        if (s.running || s.hidden !== null) return;
        if (!s.config.source) {
          set({ notice: "Acquire a digit dataset before training." });
          return;
        }
        if (e.cost > s.budget) {
          set({ notice: "Run cost exceeds the remaining research budget." });
          return;
        }
        if (e.memory > 24) {
          set({
            notice: "Out of memory. Reduce batch size or architecture width.",
          });
          return;
        }
        set({
          budget: s.budget - e.cost,
          running: {
            id: s.runs.length + 1,
            config: structuredClone(s.config),
            metrics: simulateDigits(s.config),
            cursor: 0,
            paused: false,
            reserved: e.cost,
            cost: 0,
          },
          notice: "Training compute reserved.",
        });
      },
      tick: () => {
        const s = get(),
          r = s.running;
        if (!r || r.paused) return;
        const next = { ...r, cursor: r.cursor + 1 };
        if (next.cursor >= next.metrics.length)
          set({
            runs: [...s.runs, { ...next, cost: next.reserved }],
            running: null,
            notice: "Run saved. Select its checkpoint to evaluate.",
          });
        else set({ running: next });
      },
      pause: () => {
        const r = get().running;
        if (r) set({ running: { ...r, paused: !r.paused } });
      },
      stop: () => {
        const s = get(),
          r = s.running;
        if (!r) return;
        const cost = Math.ceil((r.reserved * r.cursor) / r.metrics.length);
        set({
          budget: s.budget + r.reserved - cost,
          running: null,
          runs: r.cursor
            ? [...s.runs, { ...r, metrics: r.metrics.slice(0, r.cursor), cost }]
            : s.runs,
          notice: "Unused compute refunded. Completed epochs preserved.",
        });
      },
      select: (id) => {
        if (
          !get().running &&
          get().hidden === null &&
          get().runs.some((r) => r.id === id)
        )
          set({ selected: id });
      },
      evaluate: () => {
        const s = get(),
          r = s.runs.find((r) => r.id === s.selected);
        if (!r || s.running || s.hidden !== null) return;
        set({
          hidden: hiddenDigits(r.config, r.metrics.at(-1)!.validationAccuracy),
          notice:
            "Hidden handwriting styles evaluated. Your notebook is preserved.",
        });
      },
      reset: () => set(initial()),
    }),
    { name: "neural-lab-digits-v1", version: 1, storage: researchStorage },
  ),
);
