# Neural Labs

A browser-local ML research game. Complete the Cats vs Dogs contract on a $10,000 budget.

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

## Training Observatory

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
- `src/types/game.ts`: shared domain types.
- `tests/`: deterministic simulation, economy, contracts, state lifecycle, registry coverage and model validation.

The simulator is deterministic; no real ML training takes place. Representative animal photos are illustrative. The hidden evaluation uses a separate game-owned synthetic distribution, not the player's local test split. Progress is stored in localStorage per browser. The final contract payout is recorded separately from the remaining research budget.

The simulation is intentionally approximate. A future real-training adapter can return the same TrainingResult interface while the UI and game rules remain separate.

## Stable release

This folder preserves the Cats vs Dogs vertical slice, including Training Observatory. The parent workspace may contain concurrent work on additional LLM contracts. Its source and build are independent of those edits.
