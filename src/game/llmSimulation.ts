import { FILTERS, GPUS, SOURCES, contractFor } from "./researchCatalog";
import type {
  Capability,
  ContractId,
  LLMConfig,
  LLMEstimate,
  LLMRun,
  ResearchCheckpoint,
  Scores,
  ServingEstimate,
  TokenMetric,
  Treatment,
} from "../types/research";

export const clamp = (x: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, x));
export const round = (x: number, digits = 2) => Number(x.toFixed(digits));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const sourceScale = (id: ContractId) =>
  id === "frontier" ? 80 : id === "coding" ? 10 : 1;
export const sourceCost = (id: ContractId, cost: number) =>
  Math.ceil(cost * (id === "frontier" ? 40 : id === "coding" ? 2 : 1));
export function modelSize(c: LLMConfig) {
  const a = c.architecture,
    d = a.hidden;
  const kv =
    a.attention === "MHA" ? a.heads : a.attention === "MQA" ? 1 : a.kvHeads;
  const attention = 2 * d * d + 2 * d * d * (kv / a.heads);
  const mlp = (a.activation === "SwiGLU" ? 3 : 2) * d * a.mlp;
  const embedding = c.tokenizer.vocab * d * (a.tied ? 1 : 2);
  return {
    parameters:
      (embedding +
        a.layers * (attention + mlp * (a.moe ? a.experts : 1) + 4 * d)) /
      1e9,
    activeParameters:
      (embedding +
        a.layers * (attention + mlp * (a.moe ? a.active : 1) + 4 * d)) /
      1e9,
    embedding: embedding / 1e9,
    kvHeads: kv,
  };
}
export function projectLLM(c: LLMConfig, id: ContractId): LLMEstimate {
  const issues: string[] = [],
    warnings: string[] = [];
  const d = c.data,
    a = c.architecture,
    i = c.infrastructure,
    t = c.training;
  const weights = SOURCES.map((s) => (d.mixture[s.id] ?? 0) / 100);
  const total = round(sum(weights) * 100);
  if (total !== 100)
    issues.push(`Mixture totals ${total}%. Set the source weights to 100%.`);
  const selected = SOURCES.filter((s) => (d.mixture[s.id] ?? 0) > 0);
  const missing = selected.filter((s) => !d.acquired.includes(s.id));
  if (missing.length)
    issues.push(
      `Acquire the sources in your mixture: ${missing.map((s) => s.name).join(", ")}.`,
    );
  if (!selected.length) issues.push("Choose at least one corpus source.");
  const scale = sourceScale(id);
  const rawWords = sum(
    SOURCES.filter((s) => d.acquired.includes(s.id)).map(
      (s) => s.words * scale,
    ),
  );
  const balancedWords =
    selected.length && !missing.length
      ? Math.min(
          ...selected.map(
            (s) => (s.words * scale) / ((d.mixture[s.id] ?? 0) / 100),
          ),
        )
      : 0;
  const strength =
    d.intensity === "Aggressive" ? 1.5 : d.intensity === "Light" ? 0.6 : 1;
  const filters = FILTERS.filter((f) => d.filters.includes(f.id));
  const retained =
    filters.reduce((n, f) => n * (1 - (1 - f.retention) * strength), 1) *
    (d.decontaminate ? 0.969 : 1);
  const quality = clamp(
    sum(SOURCES.map((s, k) => s.quality * weights[k])) +
      sum(filters.map((f) => f.quality)) * strength,
    0.2,
    0.99,
  );
  const breadth = clamp(
    1 - sum(filters.map((f) => f.breadth)) * strength,
    0.5,
    1,
  );
  const algo =
    (
      {
        BPE: 1,
        "Byte-level BPE": 1.04,
        WordPiece: 1.07,
        "SentencePiece BPE": 0.99,
        Unigram: 1.02,
      } as Record<string, number>
    )[c.tokenizer.algorithm] ?? 1;
  const multilingualShare = (d.mixture.multilingual ?? 0) / 100;
  const fertility =
    (1.53 - 0.1 * Math.log2(c.tokenizer.vocab / 8000)) *
    algo *
    (1 + multilingualShare * (c.tokenizer.multilingual ? 0.1 : 0.6)) *
    (c.tokenizer.normalization === "None" ? 1.07 : 0.99) *
    (c.tokenizer.whitespace === "Collapse" ? 0.98 : 1) *
    (c.tokenizer.bos ? 1.001 : 1);
  const tokens =
    balancedWords *
    retained *
    fertility *
    (c.sequence.truncation === "Truncate tails" ? 0.9 : 1);
  const contamination = d.decontaminate ? 0.2 : 3.1;
  const size = modelSize(c);
  if (a.hidden % a.heads)
    issues.push("Hidden dimension must be divisible by attention heads.");
  if (a.attention === "GQA" && (a.kvHeads > a.heads || a.heads % a.kvHeads))
    issues.push("GQA needs KV heads that divide the query-head count.");
  if (a.moe && a.active > a.experts)
    issues.push("Active experts cannot exceed the total experts.");
  if (a.moe && a.capacity < 1.1)
    warnings.push("Low expert capacity can drop routed tokens.");
  if (a.moe && a.balance < 0.005)
    warnings.push("Weak load balancing increases the risk of dead experts.");
  const gpus = i.nodes * i.perNode,
    modelParallel = i.tensor * i.pipeline;
  if (gpus % modelParallel || modelParallel > gpus)
    issues.push(
      "Tensor × pipeline parallelism must divide your total GPU count.",
    );
  const dp = Math.max(1, Math.floor(gpus / modelParallel));
  if (a.heads % i.tensor)
    issues.push("Tensor parallelism must divide the attention-head count.");
  if (a.layers % i.pipeline)
    issues.push(
      "Pipeline stages must divide the number of Transformer layers.",
    );
  if (i.precision === "FP8" && !GPUS[i.gpu].fp8)
    issues.push("FP8 training needs the simulated H100 hardware.");
  if (t.tokens > tokens && tokens > 0)
    issues.push(
      `Token budget exceeds the available mixture (${round(tokens)}B tokens). Reduce it or acquire a larger corpus contract.`,
    );
  const effectiveBatch = i.microbatch * i.accumulation * dp;
  const packing = c.sequence.packing ? 0.96 : 0.63;
  const batchTokens = Math.max(
    1,
    effectiveBatch * c.sequence.context * packing,
  );
  const steps = Math.ceil((t.tokens * 1e9) / batchTokens);
  const shard = i.strategy === "DDP" ? modelParallel : gpus;
  const stateBytes =
    i.precision === "FP32" ? 20 : i.precision === "FP8" ? 13 : 16;
  const attentionWindow =
    a.window === "Sliding window"
      ? Math.min(c.sequence.context, 4096)
      : c.sequence.context;
  const activation =
    (a.layers *
      a.hidden *
      c.sequence.context *
      i.microbatch *
      (i.checkpointing ? 4 : 16)) /
    (1e9 * modelParallel * (i.sequenceParallel ? Math.max(1, i.tensor) : 1));
  const memory = (size.parameters * stateBytes) / shard + activation + 1.5;
  const capacity = GPUS[i.gpu].memory;
  if (memory > capacity)
    issues.push(
      `Out of memory: ${round(memory, 1)} GB per GPU exceeds ${capacity} GB. Shard states, checkpoint activations, or reduce context/microbatch.`,
    );
  const stalls = clamp(
    6 - filters.length * 0.2 + (c.sequence.packing ? 0 : 4),
    2,
    14,
  );
  const communication = clamp(
    Math.log2(gpus) * 1.4 +
      (i.nodes > 1
        ? i.network === "Ethernet"
          ? 20
          : i.network === "RoCE"
            ? 9
            : 4
        : 0) +
      (i.interconnect === "PCIe" ? 7 : 0) +
      (a.moe ? (i.expertParallel ? 6 : 17) : 0) +
      Math.max(0, i.pipeline - 1) * 2,
    0,
    65,
  );
  const utilization = clamp(93 - communication - stalls, 15, 94);
  const precision =
    i.precision === "FP32" ? 0.36 : i.precision === "FP8" ? 1.65 : 1;
  const contextCost = 1 + (attentionWindow / 2048 - 1) * 0.12;
  const flops = 6 * size.activeParameters * 1e9 * t.tokens * 1e9 * contextCost;
  const throughput =
    ((GPUS[i.gpu].tflops *
      1e12 *
      gpus *
      0.48 *
      (utilization / 100) *
      precision) /
      (6 * size.activeParameters * 1e9 * contextCost)) *
    (i.checkpointing ? 0.85 : 1) *
    packing;
  const hours = (t.tokens * 1e9) / Math.max(1, throughput) / 3600;
  const checkpointOverhead = 1 + 0.08 / Math.max(1, t.checkpointEvery);
  const cost = Math.ceil(
    hours * gpus * GPUS[i.gpu].hourly * checkpointOverhead,
  );
  if (t.tokens / size.activeParameters < 20)
    warnings.push(
      `Undertrained in this scaling heuristic: ${round(t.tokens / size.activeParameters, 1)} tokens/active parameter. Around 20–30 is a teaching reference, not a universal optimum.`,
    );
  if (c.sequence.context >= 32768)
    warnings.push(
      "Long context adds substantial attention compute, activation memory, and serving cache.",
    );
  if ((d.mixture.synthetic ?? 0) > 35)
    warnings.push(
      "A high synthetic share can reduce diversity and transfer teacher errors.",
    );
  if (!c.sequence.boundaries)
    warnings.push(
      "Missing document boundaries encourages spurious cross-document transitions.",
    );
  if (!c.tokenizer.eos)
    warnings.push(
      "Without EOS markers the model learns weaker stopping behavior.",
    );
  if (!c.tokenizer.byteFallback)
    warnings.push(
      "Rare scripts and unseen characters can become unknown tokens.",
    );
  if (!d.decontaminate)
    warnings.push(
      "Public benchmark overlap inflates visible scores; hidden evaluations use fresh examples.",
    );
  if (t.lr > 0.003 || (i.precision === "FP16" && !t.clip))
    warnings.push(
      "High learning rate or unclipped FP16 gradients increase instability risk.",
    );
  return {
    rawWords,
    retained,
    tokens,
    fertility,
    quality,
    breadth,
    contamination,
    ...size,
    gpus,
    dp,
    effectiveBatch,
    batchTokens,
    steps,
    flops,
    memory,
    capacity,
    utilization,
    communication,
    stalls,
    throughput,
    hours,
    cost,
    issues,
    warnings,
  };
}

export function baseScores(c: LLMConfig, e: LLMEstimate, fraction = 1): Scores {
  const n = e.activeParameters;
  const allocation = Math.min(
    1,
    Math.sqrt(c.training.tokens / Math.max(0.01, n * 20)),
  );
  const training = Math.min(1, fraction * 1.15);
  const lrFit = clamp(
    1 - Math.abs(Math.log10(c.training.lr / 0.0003)) * 0.2,
    0.25,
    1,
  );
  const general =
    (26 + 13 * Math.log10(1 + n * 10)) *
    allocation *
    training *
    lrFit *
    (0.65 + e.quality * 0.35);
  const scores: Scores = {
    knowledge: general,
    reasoning: general - 8,
    code: general - 12,
    writing: general + 3,
    multilingual: general - 15,
    commonsense: general + 10,
    reading: general + 5,
    instruction: general * 0.43,
    safety: 42,
    factuality: general + 5,
    tools: 10,
    context: 35 + Math.log2(c.sequence.context / 2048) * 6 + general * 0.35,
  };
  for (const source of SOURCES)
    for (const [key, value] of Object.entries(source.effects))
      scores[key as Capability] +=
        ((c.data.mixture[source.id] ?? 0) / 100) * value;
  scores.writing -= (c.data.mixture.code ?? 0) * 0.09;
  scores.multilingual -= (c.data.mixture.code ?? 0) * 0.11;
  scores.knowledge -= (c.data.mixture.code ?? 0) * 0.035;
  scores.multilingual +=
    (c.tokenizer.multilingual ? 5 : -8) +
    (c.tokenizer.byteFallback ? 2 : -6) +
    Math.log2(c.tokenizer.vocab / 32000) * 2;
  scores.reading += c.sequence.truncation === "Chunk documents" ? 2 : -2;
  scores.code -= c.tokenizer.whitespace === "Collapse" ? 5 : 0;
  scores.instruction += c.tokenizer.special.includes("assistant") ? 1 : -2;
  scores.context +=
    (c.sequence.curriculum ? 4 : 0) +
    (c.architecture.position === "Learned" && c.sequence.context > 8192
      ? -10
      : 0) +
    (c.architecture.window === "Sliding window"
      ? -5
      : c.architecture.window === "Local / global"
        ? 2
        : 0);
  scores.factuality += (e.quality - 0.65) * 16;
  scores.safety += c.data.filters.includes("toxicity") ? 4 : 0;
  scores.safety += c.data.filters.includes("pii") ? 4 : -3;
  const collapse = Math.max(0, (c.data.mixture.synthetic ?? 0) - 35) * 0.13;
  const architecturePenalty =
    (c.architecture.attention === "MQA" ? 1.5 : 0) +
    (c.architecture.norm === "LayerNorm" ? 0.3 : 0) +
    (c.architecture.activation === "ReLU" ? 1.2 : 0) +
    (c.architecture.moe
      ? Math.max(0, 0.01 - c.architecture.balance) * 200 +
        Math.max(0, 1.25 - c.architecture.capacity) * 5
      : 0);
  const stability =
    (c.training.optimizer === "SGD"
      ? 4
      : c.training.optimizer === "Adam"
        ? 1
        : 0) +
    (c.training.warmup === 0 ? 1 : 0) +
    Math.max(0, c.training.weightDecay - 0.2) * 10;
  for (const key of Object.keys(scores) as Capability[])
    scores[key] = round(
      clamp(
        (scores[key] - collapse - architecturePenalty - stability) *
          (e.breadth * 0.12 + 0.88) -
          (c.sequence.boundaries ? 0 : 2) -
          (c.tokenizer.eos ? 0 : 1) -
          (c.tokenizer.normalization === "NFKC" && key === "code" ? 2 : 0),
        2,
        97,
      ),
    );
  return scores;
}
export function learningRate(c: LLMConfig, fraction: number) {
  const warmup = c.training.warmup / 100;
  if (fraction < warmup && warmup > 0)
    return (c.training.lr * fraction) / warmup;
  const x = clamp((fraction - warmup) / (1 - warmup), 0, 1);
  const kind = c.training.scheduler;
  return (
    c.training.lr *
    (kind === "Constant"
      ? 1
      : kind === "Linear decay"
        ? 1 - 0.95 * x
        : kind === "Inverse square root"
          ? 1 / Math.sqrt(1 + x * 30)
          : 0.05 + (0.95 * (1 + Math.cos(x * Math.PI))) / 2)
  );
}
export function simulateLLM(
  c: LLMConfig,
  id: ContractId,
  runId: number,
): LLMRun {
  const e = projectLLM(c, id);
  const finalLoss =
    1.45 +
    1.7 / Math.pow(1 + e.activeParameters, 0.3) +
    (1 - e.quality) * 0.9 +
    Math.max(0, 20 - c.training.tokens / Math.max(0.01, e.activeParameters)) *
      0.018;
  const metrics: TokenMetric[] = Array.from({ length: 40 }, (_, j) => {
    const f = (j + 1) / 40;
    const noise = Math.sin((j + 1) * 2.17 + c.training.seed) * 0.018;
    const loss = finalLoss + 3.2 * Math.exp(-f * 6) + noise;
    const valLoss =
      loss +
      0.07 +
      (c.data.filters.includes("exact") ? 0 : f * 0.15) +
      Math.max(0, 0.05 - c.training.weightDecay) * f * 0.8;
    return {
      step: Math.ceil(e.steps * f),
      tokens: c.training.tokens * f,
      trainLoss: round(loss, 4),
      valLoss: round(valLoss, 4),
      perplexity: round(Math.exp(valLoss), 2),
      lr: learningRate(c, f),
      gradNorm: round(0.8 + Math.abs(noise) * 22),
      throughput: e.throughput * (0.95 + Math.sin(j + c.training.seed) * 0.03),
    };
  });
  const unstable =
    c.training.lr > 0.003 ||
    (c.infrastructure.precision === "FP16" && c.training.clip === 0);
  const dead = c.architecture.moe && c.architecture.balance < 0.005;
  const type =
    c.training.stress === "Node failure"
      ? "failure"
      : c.training.stress === "Loss spike" || unstable
        ? "spike"
        : c.training.stress === "Expert imbalance" || dead
          ? "experts"
          : null;
  const at = 17;
  const interval = Math.max(
    1,
    Math.round((c.training.checkpointEvery / 100) * 40),
  );
  const lostFrames = at - Math.floor(at / interval) * interval;
  const event: LLMRun["event"] = type
    ? {
        type,
        at,
        title:
          type === "failure"
            ? "Node stopped responding"
            : type === "spike"
              ? "Loss spike detected"
              : "Expert routing collapsed",
        description:
          type === "failure"
            ? "The latest full-state checkpoint can restore weights, optimizer, scheduler, RNG, and token position."
            : type === "spike"
              ? "Gradient norm jumped from 1.4 to 196.2. Roll back and reduce the learning rate, clip gradients, or continue with a quality penalty."
              : "Some experts receive almost no tokens. Increase load balancing and restore the latest full-state checkpoint.",
        lostCost: Math.ceil((e.cost * lostFrames) / 40),
        lostTokens: (c.training.tokens * lostFrames) / 40,
      }
    : null;
  if (event?.type === "spike") {
    metrics[at - 1].trainLoss = 7.83;
    metrics[at - 1].valLoss = 8.1;
    metrics[at - 1].perplexity = round(Math.exp(8.1));
    metrics[at - 1].gradNorm = 196.2;
  }
  return {
    id: runId,
    config: structuredClone(c),
    estimate: e,
    metrics,
    cursor: 0,
    paused: false,
    status: "running",
    reserved: e.cost,
    charged: 0,
    event,
    eventResolved: false,
    recoveries: [],
  };
}
export function checkpointAt(run: LLMRun, cursor: number): ResearchCheckpoint {
  const m = run.metrics[cursor - 1],
    f = cursor / run.metrics.length;
  const scores = baseScores(run.config, run.estimate, f);
  if (run.recoveries.includes("Continued through instability"))
    for (const k of Object.keys(scores) as Capability[])
      scores[k] = Math.max(1, scores[k] - 8);
  return {
    id: `r${run.id}-s${m.step}`,
    run: run.id,
    step: m.step,
    tokens: m.tokens,
    loss: m.valLoss,
    scores,
    config: structuredClone(run.config),
    parameters: run.estimate.parameters,
    activeParameters: run.estimate.activeParameters,
    treatments: [],
    phase: "Pretraining",
    optimizerState: true,
    schedulerState: true,
    rngState: true,
    positionState: true,
  };
}
export function treatmentCost(
  type: Treatment,
  c: LLMConfig,
  cp: ResearchCheckpoint,
  id: ContractId,
) {
  const scale = Math.max(0.4, Math.sqrt(cp.activeParameters));
  const costs: Record<Treatment, number> = {
    domain: c.domain.tokens * 45 * scale,
    sft:
      c.sft.conversations *
      0.018 *
      scale *
      (c.sft.quality === "Expert-written"
        ? 2
        : c.sft.quality === "Synthetic"
          ? 0.35
          : 1),
    synthetic:
      c.synthetic.examples *
      ({
        "3B teacher": 0.003,
        "7B teacher": 0.008,
        "70B teacher": 0.025,
        "Frontier teacher": 0.08,
        "Human-written": 0.3,
      }[c.synthetic.teacher] ?? 0.025),
    reward: c.preference.pairs * 0.025 * scale,
    alignment:
      c.preference.pairs *
      0.02 *
      scale *
      c.alignment.epochs *
      (c.alignment.method === "PPO" ? 3 : 1),
    reasoning:
      c.reasoning.problems *
      c.reasoning.candidates *
      0.015 *
      scale *
      (c.reasoning.method === "RL with verifiable rewards"
        ? 1.4
        : c.reasoning.method === "Supervised traces"
          ? 0.7
          : 1),
    safety: c.safety.examples * 0.025 * scale,
    tools: c.tools.examples * 0.035 * scale,
    redteam:
      c.evaluation.attempts *
      (c.evaluation.redTeam === "Expert security team"
        ? 0.9
        : c.evaluation.redTeam === "Human team"
          ? 0.25
          : 0.015),
    distill:
      600 *
      c.compression.student *
      scale *
      (0.6 + 0.4 * Math.sqrt(c.compression.teacher / cp.parameters)),
  };
  const annotationRate =
    c.preference.source === "Expert annotators"
      ? 0.1
      : c.preference.source === "Human annotators"
        ? 0.025
        : c.preference.source === "AI judge"
          ? 0.002
          : c.preference.source === "Constitutional AI"
            ? 0.004
            : 0.012;
  const annotation =
    type === "reward" ||
    (type === "alignment" && !cp.treatments.includes("reward"))
      ? c.preference.pairs * annotationRate
      : 0;
  return Math.max(
    1,
    Math.ceil(
      costs[type] * (id === "frontier" && type === "domain" ? 2 : 1) +
        annotation,
    ),
  );
}
export function applyTreatment(
  type: Treatment,
  c: LLMConfig,
  cp: ResearchCheckpoint,
): { scores: Scores; detail: string; loss: number } {
  const scores = { ...cp.scores };
  const add = (key: Capability, value: number) => {
    scores[key] += value;
  };
  let detail = "";
  if (type === "domain") {
    const key: Capability =
      c.domain.field === "Code"
        ? "code"
        : c.domain.field === "Mathematics"
          ? "reasoning"
          : "knowledge";
    const gain = Math.min(12, Math.log2(1 + c.domain.tokens) * 3);
    add(key, gain);
    add("writing", -gain * 0.15);
    add("multilingual", -gain * 0.2);
    detail = `${c.domain.tokens}B tokens of ${c.domain.field.toLowerCase()} continued pretraining; specialization trades some general breadth.`;
  } else if (type === "synthetic") {
    detail = `Generated ${c.synthetic.examples.toLocaleString()} examples with ${c.synthetic.teacher}. Available to the next SFT checkpoint; no weights changed yet.`;
  } else if (type === "sft") {
    const quality =
      c.sft.quality === "Expert-written"
        ? 1.15
        : c.sft.quality === "Synthetic"
          ? 0.72
          : 1;
    const generated = cp.syntheticData;
    const synthetic = generated
      ? (generated.teacher === "Frontier teacher"
          ? 2
          : generated.teacher === "3B teacher"
            ? -1
            : 1) *
        (generated.ratio / 25) *
        Math.min(1, generated.examples / 25000)
      : 0;
    const gain =
      Math.min(34, Math.log10(1 + c.sft.conversations) * 6) * quality;
    add("instruction", gain * (0.65 + c.sft.diversity / 200) + synthetic);
    add("reasoning", c.sft.reasoning * 0.06);
    add("code", c.sft.code * 0.07);
    add("multilingual", c.sft.multilingual * 0.08);
    add("safety", 5);
    add("factuality", 4);
    add("writing", 4);
    if (generated && generated.ratio > 60) {
      add("writing", -5);
      add("factuality", -3);
    }
    detail = `SFT on ${c.sft.conversations.toLocaleString()} ${c.sft.quality.toLowerCase()} conversations. Instruction following improves; pretraining loss need not improve.`;
  } else if (type === "reward") {
    detail = `Reward model trained on ${c.preference.pairs.toLocaleString()} preference pairs; held-out preference accuracy ${rewardAccuracy(c).toFixed(1)}%. This predictor can still be gamed.`;
  } else if (type === "alignment") {
    const sourceQuality =
      c.preference.source === "Expert annotators"
        ? 1.2
        : c.preference.source === "AI judge"
          ? 0.75
          : c.preference.source === "Constitutional AI"
            ? 0.85
            : 1;
    const klRisk = c.alignment.beta < 0.03 ? 8 : c.alignment.beta > 1 ? 4 : 0;
    const rewardRisk =
      c.alignment.method === "PPO"
        ? Math.max(0, 75 - (cp.rewardQuality ?? 50)) * 0.3
        : 0;
    const instability =
      Math.max(0, Math.log10(c.alignment.lr / 0.00001)) * 5 +
      Math.max(0, c.alignment.epochs - 4) * 2;
    const gain =
      Math.min(15, Math.log10(1 + c.preference.pairs) * 3) * sourceQuality;
    add("instruction", gain - klRisk - rewardRisk - instability);
    add("safety", gain * 0.8 - klRisk - instability);
    add("factuality", 3 - klRisk * 0.5);
    if (c.alignment.method === "PPO") {
      add(
        "instruction",
        Math.min(2, c.alignment.rollout / 256) +
          (c.alignment.normalize ? 1 : -2),
      );
    }
    if (c.preference.source === "AI judge") add("writing", -2);
    detail = `${c.alignment.method} using ${c.preference.source.toLowerCase()} feedback.${klRisk || rewardRisk || instability ? " Reward hacking / overoptimization risk: proxy reward rises while held-out quality declines." : " Preference optimization improves the selected behavior; judge bias remains."}`;
  } else if (type === "reasoning") {
    const verified =
      c.reasoning.method === "Supervised traces"
        ? 0.7
        : c.reasoning.verifier / 100;
    const methodScale =
      c.reasoning.method === "RL with verifiable rewards"
        ? 1
        : c.reasoning.method === "Verifier-guided training"
          ? 0.95
          : c.reasoning.method === "Rejection sampling"
            ? 0.85
            : 0.8;
    const gain =
      Math.min(
        17,
        Math.log10(1 + c.reasoning.problems) * 3.3 +
          Math.log2(c.reasoning.candidates),
      ) *
      verified *
      methodScale;
    add("reasoning", gain);
    add("code", c.reasoning.domain === "Code unit tests" ? gain : gain * 0.25);
    add(
      "knowledge",
      c.reasoning.domain === "Scientific reasoning" ? gain * 0.4 : 0,
    );
    add("factuality", (c.reasoning.verifier - 80) * 0.08);
    detail = `${c.reasoning.method}: ${c.reasoning.candidates} candidates/problem, verifier reliability ${c.reasoning.verifier}%. Reward is only as reliable as the checks.`;
  } else if (type === "safety") {
    const coverage = c.safety.categories.length / 9;
    const gain =
      Math.min(28, Math.log10(1 + c.safety.examples) * 6) *
      coverage *
      (0.5 + c.safety.strictness / 120);
    add("safety", gain);
    add("factuality", c.safety.categories.includes("Hallucinations") ? 7 : 0);
    add("instruction", -Math.max(0, c.safety.strictness - 75) * 0.15);
    detail = `Safety tuning across ${c.safety.categories.length}/9 categories. ${c.safety.strictness > 75 ? "Strict refusal policy reduces benign task completion." : "Measure harmful compliance and unnecessary refusals separately."}`;
  } else if (type === "tools") {
    const gain =
      Math.min(65, Math.log10(1 + c.tools.examples) * 13) *
      (c.tools.enabled.length / 6);
    add("tools", gain + (c.tools.structured ? 12 : 0));
    add("reasoning", c.tools.enabled.includes("Calculator") ? 2 : 0);
    add("factuality", c.tools.enabled.includes("Search") ? 3 : 0);
    detail = `Trained ${c.tools.enabled.length} tools on ${c.tools.examples.toLocaleString()} examples${c.tools.structured ? " with structured function arguments" : " without schema enforcement"}.`;
  } else if (type === "redteam") {
    detail = `${c.evaluation.attempts.toLocaleString()} adversarial attempts by ${c.evaluation.redTeam.toLowerCase()}. Estimated discovered attack success: ${attackSuccess(cp.scores, c).toFixed(1)}%. Evaluation alone does not update weights.`;
  } else if (type === "distill") {
    const ratio = clamp(c.compression.student / cp.parameters, 0.001, 1);
    const penalty =
      (1 - ratio) *
      (c.compression.distillation === "Reasoning distillation"
        ? 4
        : c.compression.distillation === "Logits distillation"
          ? 5
          : 7);
    for (const key of Object.keys(scores) as Capability[]) add(key, -penalty);
    if (c.compression.distillation === "Reasoning distillation")
      add("reasoning", 2);
    detail = `${c.compression.teacher}B external teacher → ${c.compression.student}B student via ${c.compression.distillation.toLowerCase()}; retained capability is approximate.`;
  }
  for (const key of Object.keys(scores) as Capability[])
    scores[key] = round(clamp(scores[key], 1, 98));
  return {
    scores,
    detail,
    loss:
      cp.loss +
      (type === "domain"
        ? -0.04
        : type === "sft"
          ? 0.03
          : type === "distill"
            ? 0.12
            : 0),
  };
}
export const rewardAccuracy = (c: LLMConfig) =>
  clamp(
    49 +
      Math.log10(1 + c.preference.pairs) * 5 +
      (c.preference.source === "Expert annotators"
        ? 9
        : c.preference.source === "AI judge"
          ? -4
          : c.preference.source === "Hybrid"
            ? 4
            : 0),
    50,
    90,
  );
export const attackSuccess = (scores: Scores, c: LLMConfig) =>
  clamp(
    (100 - scores.safety) *
      0.65 *
      (c.evaluation.redTeam === "Expert security team"
        ? 1.2
        : c.evaluation.redTeam === "Automated"
          ? 0.7
          : 1),
    0.1,
    95,
  );
export function estimateServing(
  cp: ResearchCheckpoint,
  c: LLMConfig,
): ServingEstimate {
  const q = c.compression.quantization,
    s = c.serving,
    a = cp.config.architecture;
  const bits =
    (
      {
        FP32: 32,
        BF16: 16,
        FP16: 16,
        FP8: 8,
        INT8: 8,
        INT6: 6,
        INT4: 4,
        "GPTQ (4-bit)": 4,
        "AWQ (4-bit)": 4,
      } as Record<string, number>
    )[q] ?? 16;
  const overhead = bits <= 8 ? 1.08 : 1;
  const weights =
    ((cp.parameters * bits) / 8) * (1 - c.compression.pruning / 100) * overhead;
  const kvHeads =
    cp.config.architecture.attention === "MHA"
      ? a.heads
      : a.attention === "MQA"
        ? 1
        : a.kvHeads;
  const kvBits =
    s.kvPrecision === "INT8" ? 8 : s.kvPrecision === "FP8" ? 8 : 16;
  const distilledScale = Math.min(
    1,
    cp.parameters / modelSize(cp.config).parameters,
  );
  const kv = s.cache
    ? ((2 *
        a.layers *
        kvHeads *
        (a.hidden / a.heads) *
        s.context *
        (kvBits / 8)) /
        1e9) *
      distilledScale
    : 0;
  const memory =
    weights +
    kv * s.batch * (s.paged ? 1.08 : 1.4) +
    1.5 * s.tensor +
    (s.speculative ? s.draft * 2 : 0);
  const capacity = GPUS[s.gpu].memory * s.tensor;
  const issues: string[] = [];
  if (c.production.inputTokens + c.production.outputTokens > s.context)
    issues.push(
      "Mean input + output length exceeds the serving context limit. Reduce request lengths or increase the serving context.",
    );
  if (s.tensor > s.gpus || s.gpus % s.tensor)
    issues.push(
      "Serving tensor parallelism must divide the serving GPU count.",
    );
  if (memory > capacity)
    issues.push(
      `Serving OOM: ${round(memory, 1)} GB per replica exceeds ${capacity} GB. Quantize, reduce concurrency/context, or increase tensor parallelism.`,
    );
  if ((q === "FP8" || s.kvPrecision === "FP8") && !GPUS[s.gpu].fp8)
    issues.push("FP8 serving requires the simulated H100 hardware.");
  const speedBase =
    ((GPUS[s.gpu].tflops * 0.24) / Math.max(0.15, cp.activeParameters)) *
    Math.sqrt(s.tensor);
  const quantSpeed =
    bits < 8 && s.gpu === "Lab GPU" ? 0.9 : Math.min(2.1, Math.sqrt(16 / bits));
  const speculative = s.speculative
    ? Math.max(
        0.65,
        1 +
          (s.acceptance / 100) * 1.1 -
          (s.draft / Math.max(0.1, cp.activeParameters)) * 0.7,
      )
    : 1;
  const speed = Math.max(
    1,
    (speedBase * quantSpeed * speculative * (s.cache ? 1 : 0.22)) /
      Math.pow(s.batch, 0.14),
  );
  const replicas = Math.max(1, Math.floor(s.gpus / s.tensor));
  const throughput = speed * s.batch * replicas * (s.continuous ? 0.85 : 0.53);
  const ttft =
    30 +
    ((s.context / 2048) * 14 * Math.sqrt(cp.activeParameters)) /
      Math.sqrt(s.tensor) +
    (s.continuous ? 12 : s.batch * 5);
  const requestsCapacity =
    (throughput * 86400) /
    Math.max(1, c.production.outputTokens + c.production.inputTokens * 0.16);
  const load = c.production.requests / Math.max(1, requestsCapacity);
  const p95 =
    (ttft / 1000 + c.production.outputTokens / speed) *
    1.2 *
    (1 + Math.max(0, load - 0.65) * 4);
  const dailyCost = s.gpus * GPUS[s.gpu].hourly * 24;
  const outputCost = (dailyCost / (throughput * 86400)) * 1e6;
  const qualityPenalty =
    (bits === 4
      ? q.startsWith("AWQ")
        ? 1.7
        : q.startsWith("GPTQ")
          ? 1.9
          : 3
      : bits === 6
        ? 1.2
        : bits === 8
          ? 0.5
          : 0) +
    Math.max(0, c.compression.pruning - 10) * 0.15 +
    (s.kvPrecision === "BF16" ? 0 : 0.4);
  return {
    weights,
    kv,
    memory,
    capacity,
    ttft,
    speed,
    throughput,
    p95,
    inputCost: outputCost * 0.3,
    outputCost,
    dailyCost,
    requestsCapacity,
    qualityPenalty,
    issues,
  };
}
export function evaluateLLM(
  cp: ResearchCheckpoint,
  c: LLMConfig,
  id: ContractId,
  remaining: number,
) {
  const serving = estimateServing(cp, c),
    contract = contractFor(id);
  const scores = { ...cp.scores };
  // Public benchmark overlap is never added to hidden scores.
  for (const key of Object.keys(scores) as Capability[])
    scores[key] = round(
      clamp(
        scores[key] -
          serving.qualityPenalty -
          (key === "context" && c.serving.context > cp.config.sequence.context
            ? 15
            : 0),
        1,
        98,
      ),
    );
  const issues = [...serving.issues];
  for (const required of contract.required)
    if (!cp.treatments.includes(required as Treatment))
      issues.push(
        `This contract requires a ${required} checkpoint in the selected model’s lineage.`,
      );
  if (id !== "language" && scores.safety < 70)
    issues.push(
      "Safety adherence must reach 70% before this assistant can pass.",
    );
  const passed = scores[contract.metric] >= contract.target && !issues.length;
  const score = Math.round(
    clamp(
      (scores[contract.metric] * 0.45 +
        scores.safety * 0.25 +
        scores.factuality * 0.15 +
        Math.min(100, (remaining / contract.budget) * 100) * 0.15) *
        100,
      0,
      10000,
    ),
  );
  return {
    scores,
    target: contract.target,
    passed,
    score,
    reward: passed ? contract.reward : 0,
    contaminationGap: cp.config.data.decontaminate ? 0.2 : 7.75,
    issues,
    selected: cp.id,
    serving,
  };
}
