export type ContractId =
  "cats" | "digits" | "language" | "chatbot" | "coding" | "frontier";
export type ResearchPage =
  | "overview"
  | "corpus"
  | "architecture"
  | "compute"
  | "post"
  | "evaluation"
  | "serving"
  | "production";
export type Capability =
  | "knowledge"
  | "reasoning"
  | "code"
  | "writing"
  | "multilingual"
  | "commonsense"
  | "reading"
  | "instruction"
  | "safety"
  | "factuality"
  | "tools"
  | "context";
export type Scores = Record<Capability, number>;
export type Contract = {
  id: ContractId;
  title: string;
  client: string;
  description: string;
  lesson: string;
  budget: number;
  reward: number;
  target: number;
  metric: Capability;
  size: string;
  required: string[];
};
export type CorpusSource = {
  id: string;
  name: string;
  cost: number;
  words: number;
  quality: number;
  specialty: string;
  effects: Partial<Scores>;
  risk: string;
};
export type CorpusFilter = {
  id: string;
  name: string;
  retention: number;
  quality: number;
  description: string;
  breadth: number;
};
export type LLMConfig = {
  data: {
    acquired: string[];
    mixture: Record<string, number>;
    filters: string[];
    intensity: string;
    decontaminate: boolean;
  };
  tokenizer: {
    algorithm: string;
    vocab: number;
    normalization: string;
    whitespace: string;
    byteFallback: boolean;
    bos: boolean;
    eos: boolean;
    special: string;
    multilingual: boolean;
  };
  sequence: {
    context: number;
    packing: boolean;
    boundaries: boolean;
    truncation: string;
    curriculum: boolean;
  };
  architecture: {
    preset: string;
    layers: number;
    hidden: number;
    heads: number;
    kvHeads: number;
    mlp: number;
    activation: string;
    norm: string;
    position: string;
    attention: string;
    window: string;
    moe: boolean;
    experts: number;
    active: number;
    capacity: number;
    balance: number;
    tied: boolean;
  };
  infrastructure: {
    gpu: string;
    nodes: number;
    perNode: number;
    network: string;
    interconnect: string;
    strategy: string;
    tensor: number;
    pipeline: number;
    sequenceParallel: boolean;
    expertParallel: boolean;
    precision: string;
    microbatch: number;
    accumulation: number;
    checkpointing: boolean;
  };
  training: {
    tokens: number;
    optimizer: string;
    lr: number;
    warmup: number;
    scheduler: string;
    clip: number;
    weightDecay: number;
    checkpointEvery: number;
    seed: number;
    stress: string;
  };
  domain: { field: string; tokens: number };
  sft: {
    conversations: number;
    quality: string;
    diversity: number;
    reasoning: number;
    code: number;
    multilingual: number;
  };
  synthetic: { teacher: string; examples: number; ratio: number };
  preference: { source: string; pairs: number; rewardAccuracy: number };
  alignment: {
    method: string;
    beta: number;
    lr: number;
    epochs: number;
    rollout: number;
    normalize: boolean;
  };
  reasoning: {
    method: string;
    domain: string;
    problems: number;
    candidates: number;
    verifier: number;
  };
  safety: { examples: number; strictness: number; categories: string[] };
  tools: { enabled: string[]; examples: number; structured: boolean };
  evaluation: { redTeam: string; attempts: number };
  compression: {
    distillation: string;
    teacher: number;
    student: number;
    quantization: string;
    pruning: number;
  };
  serving: {
    gpu: string;
    gpus: number;
    batch: number;
    continuous: boolean;
    paged: boolean;
    cache: boolean;
    kvPrecision: string;
    context: number;
    tensor: number;
    speculative: boolean;
    draft: number;
    acceptance: number;
    priceIn: number;
    priceOut: number;
  };
  production: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    feedback: string;
    sample: number;
  };
};
export type LLMEstimate = {
  rawWords: number;
  retained: number;
  tokens: number;
  fertility: number;
  quality: number;
  breadth: number;
  contamination: number;
  parameters: number;
  activeParameters: number;
  embedding: number;
  kvHeads: number;
  gpus: number;
  dp: number;
  effectiveBatch: number;
  batchTokens: number;
  steps: number;
  flops: number;
  memory: number;
  capacity: number;
  utilization: number;
  communication: number;
  stalls: number;
  throughput: number;
  hours: number;
  cost: number;
  issues: string[];
  warnings: string[];
};
export type TokenMetric = {
  step: number;
  tokens: number;
  trainLoss: number;
  valLoss: number;
  perplexity: number;
  lr: number;
  gradNorm: number;
  throughput: number;
};
export type ResearchCheckpoint = {
  id: string;
  run: number;
  step: number;
  tokens: number;
  loss: number;
  scores: Scores;
  config: LLMConfig;
  parameters: number;
  activeParameters: number;
  treatments: Treatment[];
  syntheticData?: LLMConfig["synthetic"];
  rewardQuality?: number;
  safetyCategories?: string[];
  enabledTools?: string[];
  phase: string;
  optimizerState: boolean;
  schedulerState: boolean;
  rngState: boolean;
  positionState: boolean;
};
export type TrainingEvent = {
  type: "spike" | "failure" | "experts";
  at: number;
  title: string;
  description: string;
  lostCost: number;
  lostTokens: number;
};
export type LLMRun = {
  id: number;
  config: LLMConfig;
  estimate: LLMEstimate;
  metrics: TokenMetric[];
  cursor: number;
  paused: boolean;
  status: "running" | "completed" | "stopped";
  reserved: number;
  charged: number;
  event: TrainingEvent | null;
  eventResolved: boolean;
  recoveries: string[];
};
export type Treatment =
  | "domain"
  | "sft"
  | "synthetic"
  | "reward"
  | "alignment"
  | "reasoning"
  | "safety"
  | "tools"
  | "redteam"
  | "distill";
export type ResearchAction = {
  id: string;
  type: Treatment;
  checkpoint: string;
  cost: number;
  detail: string;
  config: LLMConfig;
  scores: Scores;
};
export type HiddenReport = {
  scores: Scores;
  target: number;
  passed: boolean;
  score: number;
  reward: number;
  contaminationGap: number;
  issues: string[];
  selected: string;
  serving: ServingEstimate;
};
export type ServingEstimate = {
  weights: number;
  kv: number;
  memory: number;
  capacity: number;
  ttft: number;
  speed: number;
  throughput: number;
  p95: number;
  inputCost: number;
  outputCost: number;
  dailyCost: number;
  requestsCapacity: number;
  qualityPenalty: number;
  issues: string[];
};
export type ProductionDay = {
  day: number;
  version: number;
  requests: number;
  served: number;
  users: number;
  p95: number;
  hallucination: number;
  violations: number;
  toolFailures: number;
  cost: number;
  revenue: number;
  feedback: number;
  consented: boolean;
};
export type ResearchProject = {
  contract: ContractId;
  budget: number;
  config: LLMConfig;
  page: ResearchPage;
  version: number;
  runs: LLMRun[];
  running: LLMRun | null;
  checkpoints: ResearchCheckpoint[];
  selected: string;
  actions: ResearchAction[];
  report: HiddenReport | null;
  deployed: boolean;
  days: ProductionDay[];
  feedbackBank: number;
  history: { version: number; report: HiddenReport; days: ProductionDay[] }[];
};
