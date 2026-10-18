# LLM simulation assumptions

All benchmark values, text volumes, prices, capabilities, failure events, and production requests are deterministic educational approximations. They must not be used to budget real training or predict an actual model's performance.

## Data and tokens

Source licenses grant a fixed word pool, scaled for each contract. Mixture percentages are sampling weights. Unique mixed words are limited by `min(source words / sampling share)`; a small source can bottleneck the blend. Repetition/oversampling is not modeled. Filters combine multiplicatively; intensity changes retention, a quality index, and breadth. Benchmark-overlap removal reduces eligible tokens and removes a simulated public score boost; it does not improve hidden scores by itself.

Tokenizer fertility is an approximate vocabulary-, algorithm-, script-, and normalization-dependent tokens-per-word factor. Larger vocabularies reduce sequence token count while expanding embedding/output tables. The segmentation demonstration is illustrative and implements no tokenizer algorithm. SentencePiece is a framework; the selectable option is explicitly a BPE preset.

## Transformer and compute estimates

For hidden width `d`, MLP width `m`, layer count `L`, vocabulary `V`, and KV/query head ratio `r`:

```text
attention parameters per block = 2 d² + 2 d² r
MLP parameters per block       = 3 d m for SwiGLU; 2 d m for GELU/ReLU
embedding/output parameters    = V d if tied; 2 V d otherwise
total parameters               = embeddings + L × (attention + MLP × stored experts + normalization)
active parameters              = same expression, using active experts per token
```

Normalization terms are approximate. Positional parameters, routing buffers, logits, and optimizer details are simplified. Preset names are approximate size classes; the live estimate is authoritative within the game.

Training FLOPs use roughly `6 × active parameters × processed tokens`, with a context-length multiplier. Memory combines modeled optimizer/model states, sharding, activations, and a fixed reserve. GPU throughput, precision, communication, loader stalls, packing, and activation recomputation determine duration. Hardware rates are fictional. Unsupported FP8 and incompatible head/parallel layouts are rejected.

Effective batch is `microbatch × accumulation × data-parallel replicas`. Model-parallel GPUs are excluded from the data-parallel factor. Progress is compressed into 40 observations, each representing the displayed number of simulated updates. These are observations, not 40 optimizer steps.

Learning rates follow explicit schedules. Loss declines with capacity, quality, and exposure, with deterministic seed variation. Perplexity is `exp(validation loss)` for natural-log cross entropy. Capability scores are separate heuristics, so improved loss need not rank every capability equally.

## Recovery and post-training

Full-state checkpoints model weights, optimizer, scheduler, RNG, and token position; no tensors are stored. Intervals use percentages of progress. Loss-spike, failed-node, and expert-imbalance drills pause for recovery. Restoring repeats unsaved token work and charges it once. Continuing through instability lowers held-out capability.

Post-training creates a new checkpoint with inherited provenance and saved scores. Synthetic generation, reward-model training, and red-team evaluation record artifacts without changing policy scores. Synthetic settings and reward quality are saved so later draft edits cannot retroactively improve them. Synthetic data must precede SFT in the selected lineage to be consumed. PPO requires SFT and a reward model. DPO/IPO/ORPO share simplified controls; their real objectives and beta definitions differ. Reasoning depends on verifier reliability and candidate/task coverage. Safety strictness trades harmful compliance for unnecessary refusal.

Stages cannot be repeatedly stacked on one lineage to farm scores. Select an earlier checkpoint to compare configurations, or open another generation using reviewed production feedback.

## Inference and production

Weights scale with parameter count and precision. KV cache uses roughly `2 × layers × KV heads × head dimension × context × bytes` per sequence, with a distilled-size approximation. Replica memory combines weights, concurrent caches, workspace, and any draft model. Tensor parallelism increases one replica's capacity; more replicas increase aggregate traffic. Continuous batching and paged allocation affect utilization/fragmentation separately. Quantization reduces memory with capability tradeoffs; low-bit kernels can be slower on unsupported hardware. Speculative decoding models acceptance and draft overhead while preserving target-model quality under exact verification.

TTFT, decode rate, aggregate throughput, and P95 latency are distinct estimates. Daily capacity depends on prompt/output lengths; excess demand is dropped. Mean request lengths cannot exceed the serving context. Deployments pay fixed GPU cost even when idle. Per-million-token compute allocations assume high utilization; the production ledger records actual cost and revenue of served traffic. Awards are separate from research funds. Only opted-in feedback is sampled for the next version, which requires fresh evaluation.

## Primary conceptual reference

The [Hugging Face Transformers optimization guide](https://huggingface.co/docs/transformers/llm_tutorial_optimization) explains weight precision, attention, KV-cache growth, and MQA/GQA memory tradeoffs. It supports those conceptual relationships, not the game's formulas, prices, or synthetic scores. This is an authored teaching model, not an implementation of that guide's benchmarks.
