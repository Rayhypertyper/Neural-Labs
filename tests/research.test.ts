import { beforeEach, describe, expect, it } from "vitest";
import {
  CONTRACTS,
  FILTERS,
  MODEL_PRESETS,
  SOURCES,
  STAGES,
  initialLLM,
} from "../src/game/researchCatalog";
import {
  applyTreatment,
  baseScores,
  checkpointAt,
  estimateServing,
  evaluateLLM,
  modelSize,
  projectLLM,
  simulateLLM,
  sourceCost,
} from "../src/game/llmSimulation";
import {
  makeProject,
  selectedModel,
  useResearch,
} from "../src/store/researchStore";
import {
  RESEARCH_FIELDS,
  researchExplanations,
} from "../src/game/researchEducation";
import {
  DIGIT_SOURCES,
  INITIAL_DIGITS,
  estimateDigits,
  hiddenDigits,
  simulateDigits,
} from "../src/game/digits";
import { useDigits } from "../src/store/digitStore";
import type {
  ContractId,
  LLMConfig,
  ResearchCheckpoint,
  Treatment,
} from "../src/types/research";

function config(id: ContractId = "language"): LLMConfig {
  const c = initialLLM(id);
  c.data.acquired = SOURCES.map((s) => s.id);
  return c;
}
function checkpoint(
  c = config(),
  id: ContractId = "language",
): ResearchCheckpoint {
  return checkpointAt(simulateLLM(c, id, 1), 40);
}
function setup(id: ContractId = "language") {
  useResearch.getState().selectContract(id);
  useResearch.getState().starterCorpus();
}
function complete() {
  useResearch.getState().start();
  for (let j = 0; j < 40; j++) useResearch.getState().tick();
  const s = useResearch.getState(),
    p = s.projects[s.active]!;
  s.selectCheckpoint(p.checkpoints.at(-1)!.id);
}
function project() {
  const s = useResearch.getState();
  return s.projects[s.active]!;
}
beforeEach(() => {
  useResearch.setState({
    active: "cats",
    board: false,
    mode: "Open research",
    completed: [],
    projects: {},
    notice: null,
    speed: 2,
  });
  useDigits.getState().reset();
});

describe("LLM lifecycle and configuration effects", () => {
  it("offers six independent contracts and all 28 navigable stages", () => {
    expect(CONTRACTS).toHaveLength(6);
    expect(STAGES).toHaveLength(28);
    expect(STAGES.map((s) => s.number)).toEqual(
      Array.from({ length: 28 }, (_, j) => j + 1),
    );
  });
  it("requires acquisition and a valid normalized mixture", () => {
    const c = initialLLM("language");
    expect(
      projectLLM(c, "language").issues.some((x) => x.includes("Acquire")),
    ).toBe(true);
    c.data.acquired = SOURCES.map((s) => s.id);
    c.data.mixture.web = 80;
    expect(
      projectLLM(c, "language").issues.some((x) => x.includes("130%")),
    ).toBe(true);
  });
  it("makes large vocabularies more token efficient and larger in memory", () => {
    const c = config(),
      large = structuredClone(c);
    large.tokenizer.vocab = 128000;
    const a = projectLLM(c, "language"),
      b = projectLLM(large, "language");
    expect(b.fertility).toBeLessThan(a.fertility);
    expect(b.tokens).toBeLessThan(a.tokens);
    expect(b.embedding).toBeGreaterThan(a.embedding);
  });
  it("trades aggressive cleaning volume and breadth for quality", () => {
    const c = config(),
      b = structuredClone(c);
    b.data.intensity = "Aggressive";
    const a = projectLLM(c, "language"),
      x = projectLLM(b, "language");
    expect(x.quality).toBeGreaterThan(a.quality);
    expect(x.tokens).toBeLessThan(a.tokens);
    expect(x.breadth).toBeLessThan(a.breadth);
  });
  it("specializes a code mixture at the expense of writing and multilingual breadth", () => {
    const c = config("coding"),
      b = structuredClone(c);
    b.data.mixture = { web: 20, code: 45, qa: 10, math: 15, wiki: 5, books: 5 };
    const a = baseScores(c, projectLLM(c, "coding")),
      x = baseScores(b, projectLLM(b, "coding"));
    expect(x.code).toBeGreaterThan(a.code);
    expect(x.writing).toBeLessThan(a.writing);
    expect(x.multilingual).toBeLessThan(a.multilingual);
  });
  it("uses active parameters for MoE compute and total parameters for memory", () => {
    const c = config("coding"),
      dense = projectLLM(c, "coding");
    c.architecture.moe = true;
    const e = projectLLM(c, "coding");
    expect(e.parameters).toBeGreaterThan(e.activeParameters);
    expect(e.activeParameters).toBeGreaterThan(dense.activeParameters);
    expect(e.parameters).toBeGreaterThan(dense.parameters);
  });
  it("reduces KV cache with grouped-query and multi-query attention", () => {
    const c = config("coding");
    c.architecture.attention = "MHA";
    const a = estimateServing(checkpoint(c, "coding"), c);
    c.architecture.attention = "GQA";
    const b = estimateServing(checkpoint(c, "coding"), c);
    c.architecture.attention = "MQA";
    const d = estimateServing(checkpoint(c, "coding"), c);
    expect(a.kv).toBeGreaterThan(b.kv);
    expect(b.kv).toBeGreaterThan(d.kv);
  });
  it("rejects incompatible heads, parallel groups, FP8 hardware, and OOM", () => {
    const c = config();
    c.architecture.heads = 16;
    c.architecture.hidden = 768;
    c.architecture.attention = "GQA";
    c.architecture.kvHeads = 12;
    c.infrastructure.tensor = 8;
    c.infrastructure.precision = "FP8";
    c.sequence.context = 131072;
    c.infrastructure.microbatch = 16;
    const issues = projectLLM(c, "language").issues.join(" ");
    expect(issues).toContain("GQA");
    expect(issues).toContain("divide your total");
    expect(issues).toContain("FP8");
    c.infrastructure.tensor = 1;
    expect(projectLLM(c, "language").issues.join(" ")).toContain(
      "Out of memory",
    );
  });
  it("distinguishes microbatch, accumulation, and data-parallel replicas", () => {
    const c = config("coding");
    c.infrastructure.microbatch = 4;
    c.infrastructure.accumulation = 16;
    c.infrastructure.tensor = 2;
    const e = projectLLM(c, "coding");
    expect(e.dp).toBe(4);
    expect(e.effectiveBatch).toBe(256);
    const b = structuredClone(c);
    b.infrastructure.accumulation = 32;
    expect(projectLLM(b, "coding").memory).toBe(e.memory);
    expect(projectLLM(b, "coding").effectiveBatch).toBe(512);
  });
  it("shards optimizer states and models network overhead", () => {
    const c = config("coding");
    c.infrastructure.strategy = "DDP";
    const ddp = projectLLM(c, "coding");
    c.infrastructure.strategy = "FSDP";
    expect(projectLLM(c, "coding").memory).toBeLessThan(ddp.memory);
    c.infrastructure.nodes = 8;
    c.infrastructure.network = "Ethernet";
    const ethernet = projectLLM(c, "coding");
    c.infrastructure.network = "InfiniBand";
    expect(projectLLM(c, "coding").communication).toBeLessThan(
      ethernet.communication,
    );
  });
  it("reproduces token curves and full checkpoint provenance", () => {
    const c = config(),
      a = simulateLLM(c, "language", 1);
    expect(a).toEqual(simulateLLM(c, "language", 1));
    expect(a.metrics.at(-1)!.valLoss).toBeLessThan(a.metrics[0].valLoss);
    expect(a.metrics.at(-1)!.tokens).toBe(c.training.tokens);
    expect(a.metrics[0].perplexity).toBeCloseTo(
      Math.exp(a.metrics[0].valLoss),
      1,
    );
    const cp = checkpointAt(a, 20);
    expect(
      cp.optimizerState && cp.schedulerState && cp.rngState && cp.positionState,
    ).toBe(true);
    expect(cp.tokens).toBe(c.training.tokens / 2);
  });
  it("never adds benchmark contamination to fresh hidden scores", () => {
    const c = config(),
      b = structuredClone(c);
    b.data.decontaminate = false;
    const clean = checkpoint(c),
      dirty = checkpoint(b);
    const a = evaluateLLM(clean, c, "language", 10000),
      x = evaluateLLM(dirty, b, "language", 10000);
    expect(x.contaminationGap).toBeGreaterThan(a.contaminationGap);
    expect(x.scores).toEqual(a.scores);
  });
  it("does not update weights when generating data, training reward predictors, or testing attacks", () => {
    const c = config(),
      cp = checkpoint(c);
    for (const type of ["synthetic", "reward", "redteam"] as Treatment[])
      expect(applyTreatment(type, c, cp).scores).toEqual(cp.scores);
  });
  it("shows preference overoptimization degrading real quality", () => {
    const c = config(),
      cp = checkpoint(c),
      safe = applyTreatment("alignment", c, cp);
    c.alignment.beta = 0.01;
    c.alignment.epochs = 10;
    c.alignment.lr = 0.001;
    expect(applyTreatment("alignment", c, cp).scores.instruction).toBeLessThan(
      safe.scores.instruction,
    );
  });
  it("models quantization memory and quality losses without changing saved training curves", () => {
    const c = config("coding"),
      cp = checkpoint(c, "coding"),
      snapshot = structuredClone(cp),
      bf = estimateServing(cp, c);
    c.compression.quantization = "AWQ (4-bit)";
    const q = estimateServing(cp, c);
    expect(q.weights).toBeLessThan(bf.weights);
    expect(q.qualityPenalty).toBeGreaterThan(bf.qualityPenalty);
    expect(cp).toEqual(snapshot);
  });
  it("models speculative acceptance, cache memory, and hardware throughput separately", () => {
    const c = config("coding"),
      cp = checkpoint(c, "coding"),
      plain = estimateServing(cp, c);
    c.serving.speculative = true;
    const spec = estimateServing(cp, c);
    expect(spec.speed).toBeGreaterThan(plain.speed);
    expect(spec.qualityPenalty).toBe(plain.qualityPenalty);
    c.serving.context = 32768;
    expect(estimateServing(cp, c).kv).toBeGreaterThan(plain.kv);
    c.serving.cache = false;
    expect(estimateServing(cp, c).speed).toBeLessThan(plain.speed);
  });
});
describe("Research economy, branching, recovery, and release lifecycle", () => {
  it("keeps tutorial saves separate and switching contracts preserves each research notebook", () => {
    setup();
    const p = structuredClone(project());
    useResearch.getState().selectContract("coding");
    useResearch.getState().selectContract("language");
    expect(project()).toEqual(p);
    expect(useResearch.getState().projects.cats).toBeUndefined();
  });
  it("opens all contracts immediately and optionally enforces career unlocks", () => {
    useResearch.getState().selectContract("frontier");
    expect(useResearch.getState().active).toBe("frontier");
    useResearch.getState().selectContract("cats");
    useResearch.getState().setMode("Career");
    useResearch.getState().selectContract("coding");
    expect(useResearch.getState().active).toBe("cats");
  });
  it("charges licenses once and refuses unaffordable data", () => {
    setup();
    const budget = project().budget;
    useResearch.getState().starterCorpus();
    useResearch.getState().acquire("web");
    expect(project().budget).toBe(budget);
    useResearch.setState((s) => ({
      projects: { ...s.projects, language: { ...project(), budget: 0 } },
    }));
    useResearch.getState().acquire("dialogue");
    expect(project().budget).toBe(0);
    expect(project().config.data.acquired).not.toContain("dialogue");
  });
  it("reserves compute, pauses without progress, and refunds only unused work", () => {
    setup();
    const before = project().budget;
    useResearch.getState().start();
    const reserved = project().running!.reserved;
    for (let j = 0; j < 10; j++) useResearch.getState().tick();
    useResearch.getState().pause();
    useResearch.getState().tick();
    expect(project().running!.cursor).toBe(10);
    useResearch.getState().stop();
    expect(project().budget).toBe(before - Math.ceil(reserved / 4));
    expect(project().checkpoints.at(-1)!.tokens).toBe(0.75);
    expect(project().runs[0].status).toBe("stopped");
  });
  it("freezes configuration while training and leaves checkpoints unselected", () => {
    setup();
    useResearch.getState().start();
    useResearch.getState().configure("tokenizer", { vocab: 128000 });
    expect(project().config.tokenizer.vocab).toBe(32000);
    for (let j = 0; j < 40; j++) useResearch.getState().tick();
    expect(project().selected).toBe("");
    expect(project().checkpoints.length).toBeGreaterThan(0);
    useResearch.getState().evaluate();
    expect(project().report).toBeNull();
  });
  it("restores all training state and charges repeated failure work exactly once", () => {
    setup();
    useResearch
      .getState()
      .configure("training", { stress: "Node failure", checkpointEvery: 10 });
    const before = project().budget;
    useResearch.getState().start();
    for (let j = 0; j < 17; j++) useResearch.getState().tick();
    const r = project().running!;
    expect(r.paused).toBe(true);
    expect(r.cursor).toBe(17);
    useResearch.getState().recover("continue");
    expect(project().running!.eventResolved).toBe(false);
    useResearch.getState().recover("rollback");
    expect(project().running!.cursor).toBe(16);
    const after = project().budget;
    useResearch.getState().recover("rollback");
    expect(project().budget).toBe(after);
    for (let j = 0; j < 40; j++) useResearch.getState().tick();
    expect(project().budget).toBe(before - r.reserved - r.event!.lostCost);
    expect(project().runs[0].charged).toBe(r.reserved + r.event!.lostCost);
  });
  it("branches post-training immutably and disallows stage farming", () => {
    setup();
    complete();
    const cp = structuredClone(selectedModel(project())!);
    useResearch.getState().treatment("sft");
    const after = project().budget;
    expect(project().checkpoints.find((x) => x.id === cp.id)).toEqual(cp);
    expect(selectedModel(project())!.scores.instruction).toBeGreaterThan(
      cp.scores.instruction,
    );
    useResearch.getState().treatment("sft");
    expect(project().budget).toBe(after);
    useResearch.getState().selectCheckpoint(cp.id);
    expect(selectedModel(project())!.treatments).toEqual([]);
  });
  it("requires SFT and a reward model for PPO", () => {
    setup("chatbot");
    complete();
    useResearch.getState().configure("alignment", { method: "PPO" });
    useResearch.getState().treatment("alignment");
    expect(project().actions).toHaveLength(0);
    useResearch.getState().treatment("sft");
    useResearch.getState().treatment("alignment");
    expect(project().actions).toHaveLength(1);
    useResearch.getState().treatment("reward");
    useResearch.getState().treatment("alignment");
    expect(selectedModel(project())!.treatments).toEqual([
      "sft",
      "reward",
      "alignment",
    ]);
  });
  it("keeps generated-data and reward-model provenance after draft edits", () => {
    setup("chatbot");
    complete();
    useResearch
      .getState()
      .configure("synthetic", { teacher: "3B teacher", examples: 1000 });
    useResearch.getState().treatment("synthetic");
    useResearch.getState().configure("synthetic", {
      teacher: "Frontier teacher",
      examples: 1000000,
    });
    expect(selectedModel(project())!.syntheticData!.teacher).toBe("3B teacher");
  });
  it("invalidates release reports when selection or serving configuration changes", () => {
    setup();
    complete();
    useResearch.getState().evaluate();
    expect(project().report).not.toBeNull();
    useResearch.getState().configure("serving", { batch: 2 });
    expect(project().report).toBeNull();
    useResearch.getState().deploy();
    expect(project().deployed).toBe(false);
  });
  it("provides a passing language model within its contract budget", () => {
    setup();
    complete();
    useResearch.getState().evaluate();
    expect(project().report!.passed, JSON.stringify(project().report)).toBe(
      true,
    );
    expect(project().budget).toBeGreaterThan(0);
  });
  it("supports aligned chatbot, coding, and frontier strategies within budget", () => {
    for (const id of ["chatbot", "coding", "frontier"] as const) {
      setup(id);
      if (id === "coding") {
        useResearch.getState().configure("data", {
          mixture: { web: 20, code: 45, qa: 10, math: 15, wiki: 5, books: 5 },
        });
        useResearch.getState().starterCorpus();
      }
      complete();
      useResearch.getState().configure("sft", {
        quality: "Expert-written",
        conversations: 100000,
        diversity: 100,
        code: 70,
        reasoning: 60,
      });
      useResearch.getState().treatment("sft");
      useResearch.getState().treatment("alignment");
      useResearch.getState().treatment("reasoning");
      useResearch.getState().treatment("safety");
      if (id === "frontier") useResearch.getState().treatment("redteam");
      useResearch.getState().configure("serving", {
        gpu: "H100 80GB",
        gpus: id === "frontier" ? 8 : 1,
        tensor: id === "frontier" ? 8 : 1,
        batch: 2,
      });
      useResearch.getState().evaluate();
      expect(project().report!.issues, id).toEqual([]);
      expect(
        project().report!.scores[CONTRACTS.find((c) => c.id === id)!.metric],
        id,
      ).toBeGreaterThanOrEqual(CONTRACTS.find((c) => c.id === id)!.target);
      expect(project().report!.passed, id).toBe(true);
      expect(project().budget, id).toBeGreaterThan(0);
    }
  });
  it("deploys, accounts for daily costs, collects opt-in data, and opens v2", () => {
    setup();
    complete();
    useResearch.getState().evaluate();
    useResearch.getState().deploy();
    const before = project().budget;
    useResearch.getState().nextDay();
    const day = project().days[0];
    expect(project().budget).toBeCloseTo(before - day.cost + day.revenue);
    expect(day.served).toBeLessThanOrEqual(day.requests);
    expect(project().feedbackBank).toBeGreaterThan(0);
    const old = structuredClone(project().report);
    useResearch.getState().nextVersion();
    expect(project().version).toBe(2);
    expect(project().history[0].report).toEqual(old);
    expect(project().deployed).toBe(false);
    expect(project().report).toBeNull();
    expect(selectedModel(project())).toBeDefined();
    expect(project().config.sft.conversations).toBeGreaterThan(0);
  });
  it("respects disabled feedback and refuses operating-budget overdrafts", () => {
    setup();
    complete();
    useResearch.getState().evaluate();
    useResearch.getState().deploy();
    useResearch.getState().configure("production", { feedback: "Disabled" });
    useResearch.getState().nextDay();
    expect(project().feedbackBank).toBe(0);
    useResearch.getState().nextVersion();
    expect(project().version).toBe(1);
    useResearch.setState((s) => ({
      projects: { ...s.projects, language: { ...project(), budget: 0 } },
    }));
    const days = project().days.length;
    useResearch.getState().nextDay();
    expect(project().days).toHaveLength(days);
  });
});
describe("Digit architecture tutorial", () => {
  it("calculates a 10-class CNN and rewards normalized, diverse handwriting", () => {
    const c = { ...INITIAL_DIGITS, source: "curated" };
    const r = simulateDigits(c);
    expect(r).toEqual(simulateDigits(c));
    expect(r.at(-1)!.validationAccuracy).toBeGreaterThan(96);
    expect(
      hiddenDigits(c, r.at(-1)!.validationAccuracy),
    ).toBeGreaterThanOrEqual(96);
    expect(estimateDigits({ ...c, width: 64 }).params).toBeGreaterThan(
      estimateDigits(c).params,
    );
    expect(
      simulateDigits({ ...c, normalization: false }).at(-1)!.validationAccuracy,
    ).toBeLessThan(r.at(-1)!.validationAccuracy);
  });
  it("preserves selected checkpoints and refunds stopped training", () => {
    useDigits.getState().acquire("curated");
    const before = useDigits.getState().budget;
    useDigits.getState().start();
    for (let j = 0; j < 5; j++) useDigits.getState().tick();
    useDigits.getState().stop();
    const run = useDigits.getState().runs[0];
    expect(useDigits.getState().budget).toBe(before - run.cost);
    expect(run.metrics).toHaveLength(5);
    expect(useDigits.getState().selected).toBeNull();
  });
});
describe("Educational registry coverage", () => {
  it("covers every dynamic field, choice, source, filter and stage", () => {
    for (const [group, fields] of Object.entries(RESEARCH_FIELDS))
      for (const [key, spec] of Object.entries(fields)) {
        expect(researchExplanations[`llm.${group}.${key}`]).toBeDefined();
        for (const option of spec.options ?? [])
          expect(
            researchExplanations[`llm.${group}.${key}.${option}`],
          ).toBeDefined();
      }
    for (const source of SOURCES)
      expect(researchExplanations[`llm.source.${source.id}`]).toBeDefined();
    for (const filter of FILTERS)
      expect(researchExplanations[`llm.filter.${filter.id}`]).toBeDefined();
    for (const stage of STAGES)
      expect(researchExplanations[`llm.stage.${stage.key}`]).toBeDefined();
  });
});

describe("Release and navigation edge cases", () => {
  it("keeps production-day identifiers increasing after the retained window fills", () => {
    setup();
    complete();
    useResearch.getState().evaluate();
    useResearch.getState().deploy();
    for (let j = 0; j < 92; j++) useResearch.getState().nextDay();
    expect(project().days).toHaveLength(90);
    expect(project().days[0].day).toBe(3);
    expect(project().days.at(-1)!.day).toBe(92);
    expect(new Set(project().days.map((day) => day.day)).size).toBe(90);
  });
  it("continues an inactive contract's run without changing the active workspace", () => {
    setup();
    useResearch.getState().start();
    useResearch.getState().selectContract("coding");
    useResearch.getState().tickAll();
    expect(useResearch.getState().active).toBe("coding");
    expect(useResearch.getState().projects.language!.running!.cursor).toBe(1);
  });
  it("requires request lengths that fit the release context, including after deployment", () => {
    setup();
    complete();
    useResearch.getState().evaluate();
    useResearch.getState().deploy();
    useResearch
      .getState()
      .configure("production", { inputTokens: 2000, outputTokens: 500 });
    const before = project().budget;
    useResearch.getState().nextDay();
    expect(project().days).toHaveLength(0);
    expect(project().budget).toBe(before);
    expect(useResearch.getState().notice).toContain("context limit");
  });
  it("distills to a smaller immutable model and invalidates the old release report", () => {
    setup("coding");
    complete();
    const parent = structuredClone(selectedModel(project())!);
    useResearch
      .getState()
      .configure("compression", { teacher: 13, student: 1.3 });
    useResearch.getState().evaluate();
    useResearch.getState().treatment("distill");
    expect(selectedModel(project())!.parameters).toBe(1.3);
    expect(selectedModel(project())!.treatments).toContain("distill");
    expect(project().checkpoints.find((cp) => cp.id === parent.id)).toEqual(
      parent,
    );
    expect(project().report).toBeNull();
  });
});
