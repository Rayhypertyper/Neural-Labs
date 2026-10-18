import type { Explanation } from "../types/game";
import type { LLMConfig } from "../types/research";
import {
  FILTERS,
  GPUS,
  SAFETY_CATEGORIES,
  SOURCES,
  STAGES,
  TOOL_OPTIONS,
} from "./researchCatalog";

export type FieldSpec = {
  label: string;
  purpose: string;
  options?: (string | number)[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  type?: "boolean" | "text";
  tradeoff?: string;
};
const f = (
  label: string,
  purpose: string,
  rest: Omit<FieldSpec, "label" | "purpose"> = {},
): FieldSpec => ({ label, purpose, ...rest });
export const RESEARCH_FIELDS: Partial<
  Record<keyof LLMConfig, Record<string, FieldSpec>>
> = {
  data: {
    intensity: f(
      "Filter intensity",
      "Control how much content each active filter removes. Aggressive filtering raises average quality while reducing volume and knowledge breadth.",
      { options: ["Light", "Balanced", "Aggressive"] },
    ),
    decontaminate: f(
      "Remove benchmark overlaps",
      "Exclude known public evaluation overlap from the training corpus. Detection is imperfect: hidden tests always use fresh examples.",
      {
        type: "boolean",
        tradeoff:
          "Keeping overlap inflates public benchmarks without improving fresh-task capability.",
      },
    ),
  },
  tokenizer: {
    algorithm: f(
      "Tokenizer algorithm",
      "BPE and WordPiece build subword vocabularies; Unigram selects a probabilistic vocabulary. SentencePiece is a framework that can train BPE or Unigram; here its BPE preset uses raw-text preprocessing.",
      {
        options: [
          "BPE",
          "WordPiece",
          "SentencePiece BPE",
          "Unigram",
          "Byte-level BPE",
        ],
      },
    ),
    vocab: f(
      "Vocabulary size",
      "A larger vocabulary can represent text in fewer tokens but expands token embeddings and the output projection.",
      { options: [8000, 16000, 32000, 64000, 128000], unit: "tokens" },
    ),
    normalization: f(
      "Unicode normalization",
      "NFC preserves canonical characters. NFKC also merges compatibility forms and can erase distinctions useful in code or some scripts.",
      { options: ["None", "NFC", "NFKC"] },
    ),
    whitespace: f(
      "Whitespace handling",
      "Preserving whitespace retains code indentation. Collapsing it slightly reduces token count but loses formatting information.",
      { options: ["Preserve", "Collapse"] },
    ),
    byteFallback: f(
      "Byte fallback",
      "Encode unseen characters as bytes instead of unknown tokens. Coverage improves, although rare characters can use more tokens.",
      { type: "boolean" },
    ),
    bos: f(
      "Beginning-of-sequence token",
      "Mark the beginning of each sequence so the model learns a consistent initial context.",
      { type: "boolean" },
    ),
    eos: f(
      "End-of-sequence token",
      "Mark document endings and teach the model when to stop generating. Removing it weakens stopping behavior.",
      { type: "boolean" },
    ),
    special: f(
      "Special tokens",
      "Reserve distinct tokens for padding, user, assistant, and tool boundaries. These strings illustrate the chat protocol; actual tokenizer IDs are not trained here.",
      { type: "text" },
    ),
    multilingual: f(
      "Multilingual vocabulary coverage",
      "Allocate vocabulary coverage to multiple scripts. This improves token efficiency on multilingual data at the expense of English-only specialization.",
      { type: "boolean" },
    ),
  },
  sequence: {
    context: f(
      "Training context length",
      "Set tokens per sequence. Longer contexts consume more activation memory and attention compute; training at a length does not guarantee strong retrieval at that length.",
      { options: [2048, 4096, 8192, 16384, 32768, 131072], unit: "tokens" },
    ),
    packing: f(
      "Pack documents",
      "Pack multiple short documents into a sequence rather than wasting compute on padding. Document boundary markers remain important.",
      { type: "boolean" },
    ),
    boundaries: f(
      "Document boundaries",
      "Keep document delimiters when packing so unrelated documents do not appear to be a single narrative.",
      { type: "boolean" },
    ),
    truncation: f(
      "Long-document strategy",
      "Chunking keeps all spans across multiple sequences. Truncation drops tails, saving tokens while losing long-document evidence.",
      { options: ["Chunk documents", "Truncate tails"] },
    ),
    curriculum: f(
      "Sequence-length curriculum",
      "Start with shorter sequences and gradually increase context. This simulated curriculum improves long-context learning.",
      { type: "boolean" },
    ),
  },
  architecture: {
    layers: f(
      "Transformer layers",
      "More repeated Transformer blocks expand model capacity and compute. More capacity needs more training data.",
      { min: 4, max: 120, step: 4 },
    ),
    hidden: f(
      "Hidden dimension",
      "Set the width of token representations. The hidden dimension must be divisible by the query-head count.",
      { options: [256, 512, 768, 1024, 2048, 3072, 4096, 5120, 6656, 8192] },
    ),
    heads: f(
      "Query heads",
      "Split attention into parallel query subspaces. Tensor parallelism and hidden width must be compatible with the head count.",
      { options: [4, 8, 12, 16, 24, 32, 40, 52, 64] },
    ),
    kvHeads: f(
      "Key / value heads",
      "GQA shares keys and values among query-head groups. Fewer KV heads reduce parameter and cache memory; the count must divide query heads.",
      { options: [1, 2, 4, 8, 12, 16, 24, 32, 40, 52, 64] },
    ),
    mlp: f(
      "MLP dimension",
      "Set the width of each feed-forward block. SwiGLU uses three projection matrices, while the ReLU/GELU estimates use two.",
      { min: 512, max: 49152, step: 256 },
    ),
    activation: f(
      "MLP activation",
      "SwiGLU gates feed-forward features with an additional projection. GELU and ReLU use a simpler two-matrix MLP in this simulator.",
      { options: ["SwiGLU", "GELU", "ReLU"] },
    ),
    norm: f(
      "Normalization",
      "RMSNorm rescales root-mean-square activations; LayerNorm also centers them. Both help stabilize the residual stream.",
      { options: ["RMSNorm", "LayerNorm"] },
    ),
    position: f(
      "Position encoding",
      "RoPE rotates query/key vectors; ALiBi adds distance-dependent attention bias. Learned position embeddings are less flexible beyond the training length.",
      { options: ["RoPE", "ALiBi", "Learned"] },
    ),
    attention: f(
      "Attention heads",
      "MHA uses separate KV heads, MQA shares one, and GQA shares KV heads among groups. This changes the model footprint and inference cache.",
      { options: ["MHA", "MQA", "GQA"] },
    ),
    window: f(
      "Attention pattern",
      "Full attention connects every earlier token. Sliding windows restrict direct reach to 4K tokens here; local/global attention keeps selected longer connections.",
      { options: ["Full attention", "Sliding window", "Local / global"] },
    ),
    moe: f(
      "Mixture of Experts",
      "Replace each dense MLP with routed experts. Total stored capacity grows while only the selected experts process each token. Communication and routing become harder.",
      { type: "boolean" },
    ),
    experts: f(
      "Total experts",
      "Store this many independent MLP experts per block. All expert weights occupy memory even if most are inactive per token.",
      { options: [4, 8, 16, 32, 64] },
    ),
    active: f(
      "Active experts / token",
      "Route each token through this many experts. Active compute grows with this count; it cannot exceed total experts.",
      { options: [1, 2, 4, 8] },
    ),
    capacity: f(
      "Expert capacity factor",
      "Reserve extra token slots for each expert. Too little capacity drops tokens; higher capacity increases routing buffers.",
      { min: 1, max: 2, step: 0.05 },
    ),
    balance: f(
      "Load-balancing loss",
      "Encourage more even expert utilization. Too weak a penalty leaves dead experts and can trigger a routing failure.",
      { min: 0, max: 0.1, step: 0.001 },
    ),
    tied: f(
      "Tie embeddings & LM head",
      "Share the input embedding table with the output projection, reducing parameter memory at the cost of tying their representations.",
      { type: "boolean" },
    ),
  },
  infrastructure: {
    gpu: f(
      "Training accelerator",
      "Select a simulated hardware tier. Memory, throughput, hourly cost, and FP8 compatibility differ. Rates are game values, not current rental quotes.",
      { options: Object.keys(GPUS) },
    ),
    nodes: f(
      "Cluster nodes",
      "Each node contains the selected number of GPUs. More nodes raise aggregate compute and communication overhead.",
      { options: [1, 2, 4, 8, 16, 32, 64, 128] },
    ),
    perNode: f(
      "GPUs per node",
      "Increase the accelerators inside each node. Total GPU count is nodes × GPUs per node.",
      { options: [1, 2, 4, 8] },
    ),
    network: f(
      "Inter-node network",
      "InfiniBand and RoCE reduce simulated cross-node communication overhead compared with Ethernet.",
      { options: ["InfiniBand", "RoCE", "Ethernet"] },
    ),
    interconnect: f(
      "Intra-node interconnect",
      "NVLink provides faster GPU-to-GPU transfers in the simulation. PCIe has higher modeled communication overhead.",
      { options: ["NVLink", "PCIe"] },
    ),
    strategy: f(
      "State distribution",
      "DDP replicates model and optimizer states per data-parallel replica. FSDP and ZeRO-3 shard states across ranks to reduce per-GPU memory.",
      { options: ["DDP", "FSDP", "ZeRO-3"] },
    ),
    tensor: f(
      "Tensor parallelism",
      "Shard matrix operations across GPUs within each model replica. The factor must divide both the GPU count and attention-head count.",
      { options: [1, 2, 4, 8, 16] },
    ),
    pipeline: f(
      "Pipeline parallelism",
      "Split Transformer blocks across pipeline stages. More stages reduce per-GPU layers while introducing pipeline bubbles.",
      { options: [1, 2, 4, 8] },
    ),
    sequenceParallel: f(
      "Sequence parallelism",
      "Shard intermediate sequence activations within the tensor-parallel group to reduce activation memory.",
      { type: "boolean" },
    ),
    expertParallel: f(
      "Expert parallelism",
      "Distribute MoE experts and route tokens between their devices. This reduces the simulated routing bottleneck.",
      { type: "boolean" },
    ),
    precision: f(
      "Training precision",
      "FP32 needs more memory and compute. BF16 has a wider exponent range than FP16. FP8 offers higher simulated throughput on supported H100 hardware.",
      { options: ["FP32", "FP16", "BF16", "FP8"] },
    ),
    microbatch: f(
      "Microbatch / GPU",
      "Sequences resident on each GPU for one forward/backward pass. This affects activation memory; use accumulation to grow the global batch without increasing it.",
      { options: [1, 2, 4, 8, 16] },
    ),
    accumulation: f(
      "Gradient accumulation",
      "Accumulate gradients over multiple microsteps before updating weights. Effective batch = microbatch × accumulation × data-parallel replicas.",
      { options: [1, 2, 4, 8, 16, 32, 64, 128] },
    ),
    checkpointing: f(
      "Activation checkpointing",
      "Recompute selected activations during backward passes instead of retaining them all. This saves memory while adding compute.",
      { type: "boolean" },
    ),
  },
  training: {
    tokens: f(
      "Pretraining token budget",
      "Track training by processed tokens rather than image-classification epochs. The chosen mixture must contain enough eligible tokens.",
      { min: 0.1, max: 10000, step: 0.1, unit: "B tokens" },
    ),
    optimizer: f(
      "Optimizer",
      "AdamW is the teaching baseline. Adam uses coupled decay; SGD learns less efficiently with the default LLM-scale configuration.",
      { options: ["AdamW", "Adam", "SGD"] },
    ),
    lr: f(
      "Peak learning rate",
      "Control update size. Too small slows learning; too large can trigger a loss spike and unstable gradients.",
      { min: 0.000001, max: 0.03, step: 0.00001 },
    ),
    warmup: f(
      "Learning-rate warmup",
      "Ramp the learning rate at the beginning while optimizer statistics settle, before applying the chosen decay schedule.",
      { min: 0, max: 20, step: 1, unit: "% of steps" },
    ),
    scheduler: f(
      "Learning-rate schedule",
      "Constant holds the peak after warmup; linear, cosine, and inverse-square-root schedules reduce update size during training.",
      {
        options: [
          "Constant",
          "Linear decay",
          "Cosine decay",
          "Inverse square root",
          "Warmup + cosine",
        ],
      },
    ),
    clip: f(
      "Gradient clipping",
      "Cap the gradient norm to reduce the damage from unusually large updates. Zero disables clipping.",
      { min: 0, max: 10, step: 0.1 },
    ),
    weightDecay: f(
      "Weight decay",
      "Regularize parameter growth. Excessive decay can reduce fit; moderate decay reduces the simulated train/validation gap.",
      { min: 0, max: 0.5, step: 0.01 },
    ),
    checkpointEvery: f(
      "Full-state checkpoint interval",
      "Save model weights, optimizer, scheduler, RNG, and training position every chosen percent of token progress. Frequent saves reduce failure losses and add storage overhead.",
      { options: [5, 10, 20, 25, 50], unit: "% of run" },
    ),
    seed: f(
      "Simulation seed",
      "Set deterministic curve variation. The simulator does not run real gradient descent or train a real tokenizer.",
      { min: 1, max: 9999, step: 1 },
    ),
    stress: f(
      "Infrastructure drill",
      "Inject a reproducible incident to practice checkpoint recovery. Otherwise a stable run only fails when its configuration creates an instability risk.",
      {
        options: [
          "Stable run",
          "Loss spike",
          "Node failure",
          "Expert imbalance",
        ],
      },
    ),
  },
  domain: {
    field: f(
      "Specialization corpus",
      "Continue next-token pretraining in a focused domain. Specialization improves related capability while risking general-domain forgetting.",
      {
        options: [
          "General web",
          "Code",
          "Mathematics",
          "Medicine",
          "Law",
          "Finance",
        ],
      },
    ),
    tokens: f(
      "Additional token budget",
      "Spend compute on domain text after general pretraining. Returns diminish as the additional corpus grows.",
      { min: 0.1, max: 200, step: 0.1, unit: "B tokens" },
    ),
  },
  sft: {
    conversations: f(
      "Instruction conversations",
      "Train on user/assistant demonstrations. This teaches instruction-following behavior rather than changing the next-token objective itself.",
      { min: 1000, max: 1000000, step: 1000 },
    ),
    quality: f(
      "Instruction data quality",
      "Human-reviewed and expert-written examples cost more but provide more reliable behavior than unchecked synthetic instructions.",
      { options: ["Synthetic", "Human-reviewed", "Expert-written"] },
    ),
    diversity: f(
      "Task diversity",
      "Broader instruction coverage improves generalization across tasks, styles, and prompts.",
      { min: 10, max: 100, step: 5, unit: "%" },
    ),
    reasoning: f(
      "Reasoning examples",
      "Allocate instruction coverage to worked solutions and reasoning problems.",
      { min: 0, max: 100, step: 5, unit: "% coverage" },
    ),
    code: f(
      "Coding examples",
      "Include programming instructions and solutions to improve code behavior.",
      { min: 0, max: 100, step: 5, unit: "% coverage" },
    ),
    multilingual: f(
      "Multilingual instructions",
      "Teach instruction following in multiple languages. Coverage percentages can overlap because one conversation may satisfy several categories.",
      { min: 0, max: 100, step: 5, unit: "% coverage" },
    ),
  },
  synthetic: {
    teacher: f(
      "Data generator",
      "Larger teachers cost more and produce higher-quality simulated instructions. Human-written is the most expensive source; all teachers can transfer biases.",
      {
        options: [
          "3B teacher",
          "7B teacher",
          "70B teacher",
          "Frontier teacher",
          "Human-written",
        ],
      },
    ),
    examples: f(
      "Generated examples",
      "Create synthetic examples before SFT. Generation alone does not update the selected model’s weights.",
      { min: 1000, max: 1000000, step: 1000 },
    ),
    ratio: f(
      "Synthetic share of SFT",
      "Blend generated examples into subsequent SFT. High synthetic shares risk repetition, teacher bias, and reduced diversity.",
      { min: 0, max: 100, step: 5, unit: "%" },
    ),
  },
  preference: {
    source: f(
      "Preference evaluator",
      "Humans, experts, AI judges, constitutional criteria, or a hybrid supply preference pairs. AI feedback scales cheaply but inherits the evaluator’s biases.",
      {
        options: [
          "Human annotators",
          "Expert annotators",
          "AI judge",
          "Constitutional AI",
          "Hybrid",
        ],
      },
    ),
    pairs: f(
      "Preference pairs",
      "Rank a chosen and rejected response to each prompt. More reliable pairs improve preference optimization and reward prediction.",
      { min: 1000, max: 500000, step: 1000 },
    ),
  },
  alignment: {
    method: f(
      "Preference optimization",
      "PPO optimizes a reward model under a reference-policy penalty. DPO directly uses preference pairs; IPO and ORPO are alternative preference objectives with simplified shared controls here.",
      { options: ["DPO", "PPO", "IPO", "ORPO"] },
    ),
    beta: f(
      "Reference penalty / beta",
      "Control the strength of staying close to the reference policy. Method-specific definitions differ; the simulator uses one teaching control for regularization strength.",
      { min: 0.01, max: 2, step: 0.01 },
    ),
    lr: f(
      "Alignment learning rate",
      "Preference training usually uses smaller updates than pretraining. Large updates can overoptimize preference proxies and reduce held-out quality.",
      { min: 0.000001, max: 0.001, step: 0.000001 },
    ),
    epochs: f(
      "Preference epochs",
      "Repeated passes improve fit but too many passes can overfit preferences and increase reward hacking.",
      { min: 1, max: 10, step: 1 },
    ),
    rollout: f(
      "PPO rollout batch",
      "Generate responses for reward-model scoring. Larger rollout batches add work and modestly improve the simulated optimization signal.",
      { options: [32, 64, 128, 256, 512] },
    ),
    normalize: f(
      "Normalize rewards",
      "Standardize reward scale before PPO updates, improving simulated update stability.",
      { type: "boolean" },
    ),
  },
  reasoning: {
    method: f(
      "Reasoning method",
      "Supervised traces teach demonstrations; rejection sampling retains checked candidates; verifier-guided training and verifiable-reward RL optimize automatically checked solutions.",
      {
        options: [
          "Supervised traces",
          "Rejection sampling",
          "Verifier-guided training",
          "RL with verifiable rewards",
        ],
      },
    ),
    domain: f(
      "Verification task",
      "Math, code unit tests, logic, and scientific problems support different checks. Passing a test suite is evidence for that suite, not proof of universal correctness.",
      {
        options: [
          "Code unit tests",
          "Math proofs",
          "Logic puzzles",
          "Scientific reasoning",
        ],
      },
    ),
    problems: f(
      "Training problems",
      "Generate distinct reasoning tasks. Repeating templates can limit transfer beyond these problem families.",
      { min: 1000, max: 100000, step: 1000 },
    ),
    candidates: f(
      "Candidates per problem",
      "Sample several proposed solutions and retain or reward those passing the verifier. More samples consume more compute.",
      { options: [1, 4, 8, 16, 32, 64] },
    ),
    verifier: f(
      "Verifier reliability",
      "A reliable unit-test runner or math checker supplies useful rewards. An unreliable verifier rewards incorrect solutions and can be exploited.",
      { min: 50, max: 100, step: 1, unit: "%" },
    ),
  },
  safety: {
    examples: f(
      "Safety examples",
      "Train refusals, safe completions, and factual abstention on the selected categories. Safety behavior still needs adversarial evaluation.",
      { min: 1000, max: 200000, step: 1000 },
    ),
    strictness: f(
      "Refusal strictness",
      "Stronger refusals reduce harmful compliance. Excessive strictness rejects benign tasks and lowers instruction completion.",
      { min: 10, max: 100, step: 5, unit: "%" },
    ),
  },
  tools: {
    examples: f(
      "Tool-use demonstrations",
      "Teach when to use tools and how to interpret their outputs. More examples improve the selected tools’ simulated task success.",
      { min: 1000, max: 100000, step: 1000 },
    ),
    structured: f(
      "Structured function calling",
      "Train schema-conforming tool names and arguments. Schema validity and successful task completion remain separate metrics.",
      { type: "boolean" },
    ),
  },
  evaluation: {
    redTeam: f(
      "Adversarial evaluator",
      "Expert and human teams discover harder failure cases than the inexpensive automated suite. Testing reveals failures; it does not train the model.",
      { options: ["Automated", "Human team", "Expert security team"] },
    ),
    attempts: f(
      "Jailbreak attempts",
      "Run more adversarial cases to gain broader evidence. A low discovered attack rate does not guarantee the absence of attacks.",
      { min: 1000, max: 100000, step: 1000 },
    ),
  },
  compression: {
    distillation: f(
      "Distillation objective",
      "Transfer responses, logits, reasoning traces, or generated instructions from an external teacher to a smaller student. The selected student retains an approximate share of capability.",
      {
        options: [
          "Logits distillation",
          "Response distillation",
          "Reasoning distillation",
          "Synthetic instruction generation",
        ],
      },
    ),
    teacher: f(
      "External teacher size",
      "Select a teacher at least as large as the model being compressed. The teacher is simulated as an external service.",
      { options: [1.3, 7, 13, 30, 70, 140], unit: "B parameters" },
    ),
    student: f(
      "Student size",
      "A smaller student reduces stored weights and active compute but loses some teacher capability.",
      { options: [0.125, 0.35, 1.3, 3, 7, 13, 30], unit: "B parameters" },
    ),
    quantization: f(
      "Weight format / method",
      "FP16/BF16 retain two bytes per weight. INT8/6/4 reduce memory. GPTQ and AWQ are post-training quantization methods, represented by 4-bit presets here. Speed depends on hardware and kernels.",
      {
        options: [
          "FP32",
          "BF16",
          "FP16",
          "FP8",
          "INT8",
          "INT6",
          "INT4",
          "GPTQ (4-bit)",
          "AWQ (4-bit)",
        ],
      },
    ),
    pruning: f(
      "Pruning",
      "Remove a fraction of weights. Aggressive pruning reduces capability; physical speedups depend on sparse-kernel support, so no automatic latency benefit is assumed here.",
      { min: 0, max: 50, step: 5, unit: "%" },
    ),
  },
  serving: {
    gpu: f(
      "Serving accelerator",
      "Allocate simulated inference hardware with a fixed daily cost, even while idle. These are game rates, not live prices.",
      { options: Object.keys(GPUS) },
    ),
    gpus: f(
      "Serving GPU count",
      "GPUs are divided into tensor-parallel replicas. More replicas raise aggregate throughput and daily operating cost.",
      { options: [1, 2, 4, 8, 16, 32, 64, 128] },
    ),
    batch: f(
      "Concurrent sequences / replica",
      "More concurrent requests improve aggregate utilization but consume KV-cache memory and reduce per-user decode speed.",
      { options: [1, 2, 4, 8, 16, 32, 64, 128] },
    ),
    continuous: f(
      "Continuous batching",
      "Admit new sequences as others finish, improving throughput relative to a fixed batch that waits for its slowest request.",
      { type: "boolean" },
    ),
    paged: f(
      "Paged attention",
      "Manage KV-cache storage in blocks to reduce fragmentation. It improves effective cache allocation rather than changing model knowledge.",
      { type: "boolean" },
    ),
    cache: f(
      "KV caching",
      "Reuse earlier key/value states during autoregressive decoding. Disabling it saves persistent cache memory but forces expensive recomputation.",
      { type: "boolean" },
    ),
    kvPrecision: f(
      "KV-cache precision",
      "Reduce bytes stored per key/value element. Lower precision saves cache memory with a small modeled quality penalty and hardware constraints.",
      { options: ["BF16", "FP8", "INT8"] },
    ),
    context: f(
      "Serving context limit",
      "Maximum cached prompt and generated context per request. Serving beyond the trained context can sharply reduce long-document reliability.",
      { options: [2048, 4096, 8192, 16384, 32768, 131072], unit: "tokens" },
    ),
    tensor: f(
      "Inference tensor parallelism",
      "Shard one model replica across this many serving GPUs. The count must divide the serving GPU allocation.",
      { options: [1, 2, 4, 8, 16] },
    ),
    speculative: f(
      "Speculative decoding",
      "A draft model proposes tokens that the main model verifies. Exact verification preserves the target distribution; speedup depends on acceptance and draft overhead.",
      { type: "boolean" },
    ),
    draft: f(
      "Draft model size",
      "A smaller draft costs less to run but may have lower proposal acceptance. This model uses your separate acceptance estimate.",
      { options: [0.125, 0.35, 1, 3, 7], unit: "B parameters" },
    ),
    acceptance: f(
      "Draft acceptance estimate",
      "Higher acceptance yields a larger speculative speedup. This is a scenario assumption, not a measured model statistic.",
      { min: 10, max: 95, step: 5, unit: "%" },
    ),
    priceIn: f(
      "Input selling price",
      "Set simulated customer revenue per million input tokens. Compare it with allocated input cost and actual served traffic.",
      { min: 0, max: 100, step: 0.01, unit: "$ / million" },
    ),
    priceOut: f(
      "Output selling price",
      "Set simulated customer revenue per million generated tokens. Idle GPU time and incomplete utilization can make actual margins worse than full-load token costs.",
      { min: 0, max: 100, step: 0.01, unit: "$ / million" },
    ),
  },
  production: {
    requests: f(
      "Daily request demand",
      "Traffic beyond the serving capacity queues or is dropped. The production report counts served requests separately from total demand.",
      { min: 100, max: 10000000, step: 100, unit: "requests/day" },
    ),
    inputTokens: f(
      "Mean input length",
      "Longer input prompts add prefill work and increase revenue at the input-token selling price.",
      { min: 50, max: 100000, step: 50, unit: "tokens/request" },
    ),
    outputTokens: f(
      "Mean output length",
      "More generated tokens consume decode capacity, increase end-to-end latency, and increase output-token revenue.",
      { min: 10, max: 10000, step: 10, unit: "tokens/request" },
    ),
    feedback: f(
      "Feedback collection",
      "Collect only explicitly opted-in user feedback in this simulation, or disable collection. Reviewed examples become the next model’s SFT data.",
      { options: ["Opt-in feedback", "Disabled"] },
    ),
    sample: f(
      "Opt-in feedback sample",
      "Sample a share of consented traffic for review; only a small fraction become usable training examples. This is a simulated collection policy.",
      { min: 1, max: 50, step: 1, unit: "%" },
    ),
  },
};
const entry = (
  title: string,
  purpose: string,
  tradeoff = "Interpret this estimate together with the other research choices.",
  affects = ["Capability", "Compute", "Budget"],
): Explanation => ({
  title,
  purpose,
  pros: [purpose.split(". ")[0]],
  cons: [tradeoff],
  affects,
});
export const researchExplanations: Record<string, Explanation> = {
  "digits.contract": entry(
    "The handwriting contract",
    "Build a ten-class CNN for handwritten digits on a $15,000 budget. Hidden accuracy on unfamiliar writing styles must reach 96% to earn the $8,000 contract payout.",
    "High validation scores on a narrow collection can hide failures on new writers.",
    ["Architecture", "Generalization", "Budget"],
  ),
  "digits.pause": entry(
    "Pause digit training",
    "Pause simulated epoch playback without losing the reserved run or its completed epochs.",
    "Compute remains reserved until the run finishes or stops.",
  ),
  "digits.stop": entry(
    "Stop digit training",
    "End the current digit run, retain its completed epochs, and return the unused compute reservation.",
    "A stopped run may have learned too little to meet the hidden accuracy target.",
  ),
  "digits.start": entry(
    "Train a digit classifier",
    "Reserve the displayed compute cost and simulate CNN training on your acquired handwriting collection.",
    "Larger models can overfit a small, narrow collection.",
  ),
  "llm.lifecycle": entry(
    "The full model lifecycle",
    "Move from corpus engineering to pretraining, post-training, evaluation, and production. Every result here is a deterministic teaching simulation, not a prediction of real model performance.",
    "Benchmarks, prices, capabilities, and runtime are illustrative game values.",
  ),
  "llm.contracts": entry(
    "Research contracts",
    "Six projects take you from supervised image classification to a deployed language model. Each contract has its own budget and saved notebook.",
    "Career mode unlocks contracts in sequence; Open research makes every project available.",
    ["Progression", "Saved projects"],
  ),
  "llm.pretraining": entry(
    "Next-token pretraining",
    "Predict the next token using only the preceding context. Cross-entropy loss measures how surprised the model is by the target; perplexity is exp(loss) for natural-log cross entropy.",
    "Lower validation loss does not imply every capability benchmark improves equally.",
    ["Loss", "Perplexity", "Tokens"],
  ),
  "llm.checkpoints": entry(
    "Full-state checkpoints",
    "A resumable pretraining snapshot saves weights, optimizer, scheduler, RNG, and token position. Select a checkpoint explicitly before evaluations or post-training.",
    "Later checkpoints can have better loss but worse behavior after a harmful training choice.",
  ),
  "llm.benchmarks": entry(
    "Public and hidden evaluations",
    "The public suite uses named benchmark-inspired synthetic scores. Known training overlap raises the public score only. Hidden scores use fresh cases and account for deployment compression.",
    "These numbers are not official benchmark measurements.",
    ["Contamination", "Generalization", "Model selection"],
  ),
  "llm.serving": entry(
    "Inference economics",
    "Weights, KV cache, concurrency, precision, hardware, and traffic determine memory, token speed, latency, and operating costs.",
    "A full-load cost per token can underestimate cost when GPUs sit idle.",
    ["VRAM", "Latency", "Profit"],
  ),
  "llm.feedback": entry(
    "The data flywheel",
    "Deploy, observe traffic, review opted-in feedback, and open another version. The previous release remains in the version archive.",
    "Feedback is a biased sample of production traffic and still needs review.",
    ["Versions", "Instruction data", "Operating budget"],
  ),
};
for (const [group, fields] of Object.entries(RESEARCH_FIELDS))
  for (const [key, spec] of Object.entries(fields)) {
    const help = `llm.${group}.${key}`;
    researchExplanations[help] = entry(spec.label, spec.purpose, spec.tradeoff);
    for (const option of spec.options ?? [])
      researchExplanations[`${help}.${option}`] = entry(
        `${spec.label}: ${option}`,
        `${option} is selected. ${spec.purpose}`,
        spec.tradeoff,
      );
  }
for (const s of STAGES)
  researchExplanations[`llm.stage.${s.key}`] = entry(
    s.title,
    `Stage ${s.number} of the model lifecycle. ${s.title} connects your research choices to the next saved model checkpoint or deployment artifact.`,
  );
for (const s of SOURCES)
  researchExplanations[`llm.source.${s.id}`] = entry(
    s.name,
    `Acquire ${s.name.toLowerCase()} for ${s.specialty.toLowerCase()}. Allocate its percentage in the training mixture after purchasing access.`,
    s.risk,
    ["Data quality", s.specialty, "Budget"],
  );
for (const filter of FILTERS)
  researchExplanations[`llm.filter.${filter.id}`] = entry(
    filter.name,
    filter.description,
    `Balanced intensity retains approximately ${(filter.retention * 100).toFixed(1)}% of eligible text at this step. Filters combine multiplicatively.`,
    ["Token volume", "Quality", "Breadth"],
  );
for (const category of SAFETY_CATEGORIES)
  researchExplanations[`llm.safety.${category}`] = entry(
    category,
    `Include ${category.toLowerCase()} examples in safety tuning and adversarial evaluation. Training coverage improves simulated safety adherence.`,
    "Refusal overgeneralization can block legitimate requests.",
    ["Safety", "Refusal rate"],
  );
for (const tool of TOOL_OPTIONS)
  researchExplanations[`llm.tool.${tool}`] = entry(
    tool,
    `Teach the model when to use ${tool} and how to interpret the returned result. This is a simulation; it does not execute external tools.`,
    "Argument validity does not guarantee a successful multi-step task.",
    ["Tool selection", "Arguments", "Task completion"],
  );
