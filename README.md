# Neural Labs

A browser-local AI research lab simulator, from a first image classifier to a versioned language-model release. Open **All six research contracts** from the tutorial sidebar. Open research mode makes every contract available immediately; every project keeps its own budget and notebook. Career mode optionally unlocks contracts in sequence.

## Run

```sh
npm install
npm run dev
```

## Verify

```sh
npm test
npm run build
```

## Contracts

| Research question              |      Budget | What you learn                                                          |
| ------------------------------ | ----------: | ----------------------------------------------------------------------- |
| Cats vs Dogs                   |     $10,000 | The preserved data/CNN/training/checkpoint/deployment tutorial          |
| Read the handwriting           |     $15,000 | Ten-class CNN architecture, data diversity, augmentation, hidden styles |
| A language model, from scratch |     $25,000 | Corpus engineering, tokenization, Transformers, next-token prediction   |
| Give your model a voice        |     $50,000 | Instruction tuning, preferences, alignment, safety                      |
| The coding companion           |    $100,000 | Code mixtures, distributed training, verifiers, coding capability       |
| Beyond the benchmark           | $15,000,000 | Cluster economics, reasoning, safety, red teaming, production           |

## LLM workbench

The overview links to all 28 lifecycle stages. The workspaces cover:

- **Corpus & tokenizer:** eleven text/code sources, paid licenses, fourteen cleaning passes, benchmark-overlap removal, mixture percentages, subword algorithms and vocabulary, Unicode handling, special tokens, packing, document boundaries, context, and sequence curriculum.
- **Transformer design:** eight approximate size presets, editable block dimensions, MHA/MQA/GQA, position encoding, dense/MoE routing, active versus stored parameters, and embedding tying.
- **Pretraining room:** multi-node GPU topology, DDP/FSDP/ZeRO-3, tensor/pipeline/sequence/expert parallelism, FP32/FP16/BF16/FP8, microbatch and accumulation, token budgets, warmup/decay, clipping, live loss/perplexity/throughput, and checkpoint recovery drills.
- **Post-training:** domain-adaptive pretraining, instruction demonstrations, synthetic teachers, preference pairs, reward models, PPO/DPO/IPO/ORPO, AI feedback, verified reasoning, category-specific safety, tool use, and structured calls.
- **Evaluations:** public versus hidden scores, contamination, twelve capability suites, long-context tests, factuality/calibration proxies, agent tasks, red teams, checkpoint comparison, and explicit release selection.
- **Optimize & deploy:** teacher/student distillation, weight quantization and pruning, KV-cache memory/precision, batching, paged attention, speculative decoding, tensor-parallel replicas, TTFT, decode speed, latency, and token economics.
- **Production:** simulated daily traffic, capacity-limited requests, costs/revenue, hallucination/safety/tool failures, opt-in feedback, archived releases, and the next model generation.

Every stage has educational explanations. The compact **Learning, in tokens** dock expands to inspect a free draft forecast or the latest saved/live run, including loss curves and an observation scrubber. Named benchmark scores are synthetic teaching values, not official benchmark measurements.

## Saves and accounting

The original tutorial's `neural-lab-session-v1` storage stays separate. LLM projects use `neural-lab-research-v1`; the digit notebook uses `neural-lab-digits-v1`. Browser reloads restore projects and saved runs. LLM playback continues across workspace and contract navigation while the app is open.

Each LLM project retains its latest 20 completed/stopped runs, 80 checkpoints, and 90 production days in the current version. Release archives preserve that retained daily window. Export is not implemented; clearing browser storage removes these local saves.

Acquisition charges once per source per contract. Pretraining reserves compute and refunds unprocessed work when stopped. Full-state snapshots model weights, optimizer, scheduler, RNG, and token position; incidents charge repeated work separately. Explicit checkpoint selection is required. Post-training creates immutable branches. Repeating a stage requires selecting an earlier branch or opening a new version.

Serving/model edits invalidate the release report. Hidden evaluation must pass before deployment. Production charges fixed daily GPU cost and credits revenue for served traffic. Awards are recorded separately from operating funds. Only opted-in feedback can open the next generation. Archived releases retain their hidden evaluation and daily history.

See [simulation assumptions](docs/LLM_SIMULATION.md) for formulas and limits. No real model, tokenizer, GPU cluster, external tool, or production service is executed. No real purchases or data collection occur.

## Vision Training Observatory

“Learning, in view” stays at the bottom of every workspace stage. Edit data, model or training settings to update the representative network, free forecast and explanation of the change. Previewing a draft spends no research budget.

- Select **Explore** to open layer details, training-phase explanations and recent changes. Select a network block or enable **All layers** to inspect individual operations.
- Use **Follow workspace**, **Current draft · preview** or a saved experiment to choose the evidence shown. Live training takes priority. On compact mobile layouts, open **Explore** to access the source selector and curves.
- Switch between accuracy and loss, seek an epoch with the slider or chart, and play, pause, step or change playback speed. Seeking during a run pauses training; **Follow latest epoch** returns to its newest available metrics.
- Draft comparisons show the previous edit by default. **Pin baseline** keeps a configuration for later comparisons; **Unpin baseline** restores comparison with the previous edit. Baselines and recent changes last for the current page session.

The curves distinguish training with dashes, validation with a solid line and the comparison with dots. Metrics are approximate simulator results. The network shows representative units and illustrative signal flow, without real neuron activations or gradients. Saved experiments retain the configuration and simulator metrics from their run.

## Architecture

- `src/game/`: pure simulation, architecture and memory estimates, economy, scoring, option catalogs and educational registry.
- `src/store/gameStore.ts`: persisted Zustand game state, purchases, epoch playback and refunds, submission lifecycle.
- `src/components/`: separate data, model, training, results, deployment, chart and education interfaces.
- `src/game/observatory.ts`: draft projections, configuration comparisons, layer descriptions and training-phase explanations shared by the persistent Observatory.
- `src/game/llmSimulation.ts`: deterministic LLM estimates, token curves, post-training effects, serving economics, and hidden evaluation.
- `src/game/researchCatalog.ts`, `researchEducation.ts`: contracts, corpus/filter/model catalogs, and educational coverage.
- `src/store/researchStore.ts`: saved projects, accounting, recovery, checkpoint branches, production, and versions.
- `src/game/digits.ts`, `src/store/digitStore.ts`: ten-class CNN tutorial.
- `src/types/game.ts`: shared domain types.
- `tests/`: deterministic simulation, economy, contracts, state lifecycle, registry coverage and model validation.

The active test suite includes budget accounting, failure recovery, checkpoint lineage, release invalidation, passing LLM strategies, production feedback, and tutorial regressions. Archived copies under `releases/` are excluded from active test discovery.

The simulator is deterministic; no real ML training takes place. Representative animal photos are illustrative. The hidden evaluation uses a separate game-owned synthetic distribution, not the player's local test split. Progress is stored in localStorage per browser. The final contract payout is recorded separately from the remaining research budget.

The simulation is intentionally approximate. A future real-training adapter can return the same TrainingResult interface while the UI and game rules remain separate.
