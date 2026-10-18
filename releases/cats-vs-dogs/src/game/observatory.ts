import { CLEANING, LAYER_NAMES } from "./catalog";
import { estimate, validateArchitecture, validateDataset } from "./economy";
import { explanations } from "./explanations";
import { simulateTraining } from "./simulation";
import type {
  DeploymentConfig,
  EpochMetrics,
  ExperimentConfig,
  Layer,
  TrainingResult,
} from "../types/game";

export function projectTraining(config: ExperimentConfig): {
  result: TrainingResult | null;
  issues: string[];
} {
  const issues = [
    ...validateDataset(config.dataset),
    ...validateArchitecture(config.architecture),
  ];
  const t = config.training;
  if (!Number.isFinite(t.lr) || t.lr < 0.000001 || t.lr > 1)
    issues.push("Choose a learning rate between 0.000001 and 1.");
  if (!Number.isFinite(t.epochs) || t.epochs < 1 || t.epochs > 120)
    issues.push("Choose between 1 and 120 epochs.");
  if (issues.length) return { result: null, issues };
  try {
    const result = simulateTraining(config);
    return { result, issues: result.status === "oom" ? [result.message!] : [] };
  } catch (error) {
    return { result: null, issues: [(error as Error).message] };
  }
}

export type ConfigChange = {
  title: string;
  before: string;
  after: string;
  explanation: string;
  help?: string;
};
const format = (value: unknown) =>
  typeof value === "boolean"
    ? value
      ? "Enabled"
      : "Disabled"
    : typeof value === "number"
      ? value !== 0 && Math.abs(value) < 0.00001
        ? value.toExponential(1)
        : Number(value.toFixed(5)).toLocaleString("en-US", {
            maximumFractionDigits: 5,
          })
      : Array.isArray(value)
        ? value.join(", ") || "None"
        : String(value);
const fieldHelp: Record<string, string> = {
  catRatio: "balance",
  labelQuality: "quality",
  diversity: "diversity",
  night: "lighting",
  duplicates: "duplicates",
  corrupted: "clean.corrupted",
  cleaned: "clean.deduplicate",
  samples: "samples",
  quantization: "quantization",
  pruning: "pruning",
  batch: "batch",
  hardware: "hardware",
};
const fieldNames: Record<string, string> = {
  samples: "Dataset size",
  catRatio: "Cat proportion",
  labelQuality: "Label quality",
  diversity: "Diversity",
  night: "Low-light coverage",
  duplicates: "Duplicates",
  corrupted: "Corrupted images",
  cleaned: "Data cleaning",
  lr: "Learning rate",
  weightDecay: "Weight decay",
  clip: "Gradient clipping",
  earlyStopping: "Early stopping",
  warmup: "Warmup epochs",
  seed: "Random seed",
  hardware: "Hardware",
  optimizer: "Optimizer",
  loss: "Loss function",
  batch: "Batch size",
  dropout: "Dropout",
  momentum: "Momentum",
  scheduler: "Learning-rate schedule",
  patience: "Early stopping patience",
  epochs: "Epoch limit",
  resolution: "Image resolution",
  normalization: "Normalization",
  sampling: "Sampling",
  quantization: "Weight precision",
  pruning: "Pruning",
};
const fractionKeys = new Set([
  "catRatio",
  "labelQuality",
  "diversity",
  "night",
  "duplicates",
  "corrupted",
  "dropout",
]);
function fieldValue(key: string, value: unknown) {
  if (fractionKeys.has(key) && typeof value === "number")
    return `${Number((value * 100).toFixed(1))}%`;
  return format(value);
}

function decisionExplanation(
  key: string,
  before: unknown,
  after: unknown,
  config: ExperimentConfig,
  fallback: string,
) {
  const higher =
    typeof before === "number" && typeof after === "number" && after > before;
  const t = config.training;
  if (key === "lr") {
    if (t.lr > (t.optimizer.startsWith("SGD") ? 0.6 : 0.12) && !t.clip)
      return "This learning rate is too large for the selected optimizer in this simulator. Loss grows rapidly and the forecast stops after divergence. Reduce the learning rate or explore gradient clipping.";
    if (t.lr < 0.0001)
      return "Very small weight updates make learning slow. With the same epoch budget, the network may stop before it has learned enough; compare the flatter forecast with the previous curve.";
    return `${higher ? "Larger" : "Smaller"} updates change how quickly the model learns and how stable it is. Moving toward the optimizer’s effective learning-rate range improves convergence; the forecast shows the combined outcome.`;
  }
  if (key === "batch")
    return `${higher ? "Larger" : "Smaller"} batches hold ${higher ? "more" : "fewer"} image activations in GPU memory and use ${higher ? "fewer" : "more"} weight updates per epoch. Compare VRAM, run cost and the validation curve; batches over 128 carry a small generalization penalty in this simulator.`;
  if (key === "dropout")
    return `${higher ? "More" : "Fewer"} training units are suppressed in the illustrative diagram. ${t.dropout > 0.45 ? "This high rate can prevent the model from learning enough, reducing both training and validation accuracy." : "Dropout trades a closer fit to the training data for regularization; whether validation improves depends on model capacity and data."} Validation uses all units.`;
  if (key === "epochs")
    return `${higher ? "More" : "Fewer"} passes through the training set change the curve’s endpoint and compute budget. More epochs can improve fit, but validation can plateau or fall; early stopping may shorten the run.`;
  if (key === "resolution")
    return `${higher ? "Larger" : "Smaller"} input images carry ${higher ? "more" : "less"} detail and require ${higher ? "more" : "less"} activation memory and compute. The input dimensions and every downstream feature-map shape now follow this resolution.`;
  if (key === "weightDecay")
    return `${higher ? "Stronger" : "Weaker"} weight decay changes regularization in the simulator. It can reduce the penalty from an oversized model; compare validation with training to judge the tradeoff.`;
  if (key === "seed")
    return "The random seed changes reproducible noise in the simulated learning curves. One seed’s improvement is not evidence that the training strategy is better; compare several controlled runs.";
  if (key === "hardware")
    return "Training hardware changes available GPU memory and the compute price. It does not improve a valid run’s learning curve by itself; it can make a previously oversized configuration fit.";
  if (key === "earlyStopping")
    return `${after ? "The run can now stop" : "The run will no longer stop early"} after validation stalls. Saved checkpoints are preserved; the forecast and compute use the resulting completed epochs.`;
  if (key === "patience")
    return `Early stopping will wait ${after} epochs without sufficient validation improvement. ${t.earlyStopping ? "This can change the forecast’s stopping point and cost." : "Early stopping is currently disabled, so patience has no effect on this run."}`;
  if (key === "momentum" && t.optimizer !== "SGD + Momentum")
    return "Momentum changes are stored, but the selected optimizer does not use this control in this simulator. The learning curve therefore remains unchanged.";
  return fallback;
}

/** Diff every editable training/data field; explanations use the same registry as the field guide. */
export function describeChanges(
  before: ExperimentConfig,
  after: ExperimentConfig,
): ConfigChange[] {
  const changes: ConfigChange[] = [];
  const add = (
    key: string,
    a: unknown,
    b: unknown,
    title = fieldNames[key] ?? key,
    help = fieldHelp[key] ?? key,
  ) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    const fallback =
      explanations[`${help}.${b}`]?.purpose ??
      explanations[help]?.purpose ??
      "This changes the training configuration. The preview shows its combined effect with your other choices.";
    changes.push({
      title,
      before: fieldValue(key, a),
      after: fieldValue(key, b),
      help,
      explanation: decisionExplanation(key, a, b, after, fallback),
    });
  };
  for (const key of Object.keys(
    after.training,
  ) as (keyof ExperimentConfig["training"])[])
    add(key, before.training[key], after.training[key]);
  for (const key of Object.keys(
    after.dataset,
  ) as (keyof ExperimentConfig["dataset"])[]) {
    if (["packages", "augmentation", "split", "cleaned"].includes(key))
      continue;
    add(key, before.dataset[key], after.dataset[key]);
  }
  for (const key of Object.keys(
    after.dataset.split,
  ) as (keyof ExperimentConfig["dataset"]["split"])[]) {
    add(
      `split.${key}`,
      before.dataset.split[key],
      after.dataset.split[key],
      `${key[0].toUpperCase()}${key.slice(1)} split`,
      `split.${key}`,
    );
  }
  for (const key of Object.keys(
    after.dataset.augmentation,
  ) as (keyof ExperimentConfig["dataset"]["augmentation"])[]) {
    add(
      `aug.${key}`,
      before.dataset.augmentation[key],
      after.dataset.augmentation[key],
      explanations[`aug.${key}`]?.title ?? key,
      `aug.${key}`,
    );
  }
  if (
    JSON.stringify(before.dataset.cleaned) !==
    JSON.stringify(after.dataset.cleaned)
  ) {
    const added = after.dataset.cleaned.filter(
      (id) => !before.dataset.cleaned.includes(id),
    );
    if (!added.length)
      changes.push({
        title: "Cleaning reset",
        before: before.dataset.cleaned.join(", "),
        after: "Review new collection",
        explanation:
          "Adding data resets cleaning status. Inspect the combined collection before deciding whether another cleaning pass is useful.",
      });
    for (const id of added)
      changes.push({
        title: CLEANING.find((a) => a.id === id)?.name ?? "Data cleaning",
        before: "Not applied",
        after: "Applied",
        explanation: explanations[`clean.${id}`].purpose,
        help: `clean.${id}`,
      });
  }
  if (
    JSON.stringify(before.dataset.packages) !==
    JSON.stringify(after.dataset.packages)
  ) {
    changes.push({
      title: "Dataset acquired",
      before: `${before.dataset.samples.toLocaleString()} images`,
      after: `${after.dataset.samples.toLocaleString()} images`,
      explanation:
        "The input pool and its weighted quality, class balance and diversity have changed. All downstream estimates now use the combined dataset.",
    });
  }
  if (
    JSON.stringify(before.architecture) !== JSON.stringify(after.architecture)
  ) {
    const a = before.architecture.layers,
      b = after.architecture.layers;
    const sameIds =
      a.length === b.length && a.every((l, i) => l.id === b[i].id);
    if (!sameIds || before.architecture.name !== after.architecture.name) {
      changes.push({
        title: "Network architecture",
        before: `${before.architecture.name} · ${a.length} layers`,
        after: `${after.architecture.name} · ${b.length} layers`,
        explanation:
          "The network diagram follows the new layer order. Capacity, feature-map memory and compute estimates are recalculated; a larger model can fit more patterns but also overfit.",
      });
    }
    for (const l of b) {
      const old = a.find((x) => x.id === l.id);
      if (!old) continue;
      for (const key of [
        "kind",
        "width",
        "kernel",
        "stride",
        "padding",
        "activation",
      ] as const) {
        add(
          key,
          old[key],
          l[key],
          `${LAYER_NAMES[l.kind]} ${key}`,
          key === "activation"
            ? `activation.${l.activation}`
            : key === "width"
              ? "filters"
              : key === "kind"
                ? `layer.${l.kind}`
                : key,
        );
      }
    }
  }
  return changes;
}

export function describeDeploymentChanges(
  before: DeploymentConfig,
  after: DeploymentConfig,
): ConfigChange[] {
  const effects: Record<keyof DeploymentConfig, string> = {
    quantization:
      "Lower precision reduces stored weight size and estimated inference latency. FP16 and INT8 incur different simulated accuracy penalties. Training curves stay the same because weights are compressed after training.",
    pruning:
      "Pruning removes a share of the deployed weights, reducing size and latency. In this simulator, pruning beyond 15% adds an accuracy penalty at evaluation; saved training metrics stay the same.",
    hardware:
      "Inference hardware changes deployment latency. It does not retrain the network or alter saved epoch metrics.",
    batch:
      "Inference batch size changes the latency estimate. It does not change the batch size used by this saved training run.",
  };
  return (Object.keys(after) as (keyof DeploymentConfig)[])
    .filter((key) => before[key] !== after[key])
    .map((key) => ({
      title: `Deployment ${fieldNames[key]}`,
      before: format(before[key]),
      after: format(after[key]),
      explanation: effects[key],
    }));
}

export function comparisonSummary(
  before: ExperimentConfig,
  after: ExperimentConfig,
) {
  const a = projectTraining(before),
    b = projectTraining(after);
  const ea = estimate(before),
    eb = estimate(after);
  const lastA = a.result?.epochs.at(-1),
    lastB = b.result?.epochs.at(-1);
  return {
    accuracy:
      lastA && lastB
        ? lastB.validationAccuracy - lastA.validationAccuracy
        : null,
    loss: lastA && lastB ? lastB.validationLoss - lastA.validationLoss : null,
    memory: eb.vram - ea.vram,
    cost:
      (b.result?.trainingCost ?? eb.cost) - (a.result?.trainingCost ?? ea.cost),
    before: a.result,
    after: b.result,
  };
}

export type NetworkLayer = {
  id: string;
  name: string;
  kind: Layer["kind"] | "input";
  units: number;
  shape: string;
  detail: string;
  explanation: string;
};
export function networkLayers(config: ExperimentConfig): NetworkLayer[] {
  let spatial = config.dataset.resolution,
    channels = 3,
    pooled = false;
  const layers: NetworkLayer[] = [
    {
      id: "input",
      name: "Images",
      kind: "input",
      units: 3,
      shape: `${spatial} × ${spatial} × 3`,
      detail: `${config.dataset.samples.toLocaleString()} images · batch ${config.training.batch}`,
      explanation: `${config.dataset.normalization} preprocessing; ${config.dataset.sampling.toLowerCase()} sampling. ${config.dataset.split.train}% trains the model, ${config.dataset.split.validation}% validates it and ${config.dataset.split.test}% is held out for testing.`,
    },
  ];
  for (const l of config.architecture.layers) {
    let detail = "";
    if (l.kind === "conv") {
      spatial =
        l.padding === "Same"
          ? Math.ceil(spatial / l.stride)
          : Math.max(1, Math.floor((spatial - l.kernel) / l.stride) + 1);
      channels = l.width;
      detail = `${l.width} filters · ${l.kernel} × ${l.kernel} · stride ${l.stride} · ${l.padding}`;
    } else if (l.kind === "pool") {
      spatial = Math.max(1, Math.floor(spatial / 2));
      detail = "2 × 2 pooling · stride 2";
    } else if (l.kind === "global") {
      pooled = true;
      spatial = 1;
      detail = "Average each feature map";
    } else if (l.kind === "dense") {
      channels = l.width;
      detail = `${l.width} output units`;
    } else if (l.kind === "relu") detail = l.activation;
    else if (l.kind === "dropout")
      detail = `${Math.round(config.training.dropout * 100)}% training dropout`;
    else detail = "Normalize feature channels";
    layers.push({
      id: l.id,
      name: LAYER_NAMES[l.kind],
      kind: l.kind,
      units: channels,
      shape: pooled
        ? `${channels} features`
        : `${spatial} × ${spatial} × ${channels}`,
      detail,
      explanation:
        explanations[`layer.${l.kind}`]?.purpose ??
        "Transforms the representation passed to the next layer.",
    });
  }
  return layers;
}

export const TRAINING_PHASES = [
  {
    id: "forward",
    label: "Predict",
    explanation:
      "A batch of images moves forward through the network. Convolutions find patterns, activations transform them, and the final layer produces a score for each class.",
  },
  {
    id: "loss",
    label: "Measure loss",
    explanation:
      "The loss function compares model outputs with the batch’s labels. Lower loss means the predictions fit those labels better; it does not by itself prove good generalization.",
  },
  {
    id: "backward",
    label: "Backpropagate",
    explanation:
      "Gradients carry the loss signal backward through the layers, indicating how each trainable weight should change. Clipping can limit large gradients; saturated activations can weaken them.",
  },
  {
    id: "update",
    label: "Update weights",
    explanation:
      "The optimizer uses gradients and the learning rate to update weights. The scheduler and warmup adjust the step size; weight decay discourages large weights.",
  },
  {
    id: "validate",
    label: "Validate",
    explanation:
      "After an epoch, held-out validation examples measure generalization with dropout disabled and no weight updates. A growing train–validation gap can signal overfitting.",
  },
] as const;
export type TrainingPhase = (typeof TRAINING_PHASES)[number]["id"];

export function explainEpoch(epochs: EpochMetrics[], epoch: number) {
  const m = epochs.find((x) => x.epoch === epoch);
  if (!m)
    return "Before the first epoch, there are no measured training metrics. The network diagram shows the configured architecture; play or step through epochs to see the simulated learning trajectory.";
  const previous = epochs.find((x) => x.epoch === epoch - 1);
  const gap = m.trainAccuracy - m.validationAccuracy;
  if (m.trainLoss > 3)
    return `Loss has reached ${m.trainLoss.toFixed(3)}. Updates are unstable; compare the learning rate and clipping settings before the next run.`;
  const movement = previous
    ? `Validation ${m.validationAccuracy >= previous.validationAccuracy ? "rose" : "fell"} by ${Math.abs(m.validationAccuracy - previous.validationAccuracy).toFixed(2)} percentage points this epoch. `
    : "The first epoch establishes a starting point for comparison. ";
  return (
    movement +
    (gap > 8
      ? `Training accuracy leads validation by ${gap.toFixed(1)} points. The model is fitting the training examples more closely than unseen examples; inspect data quality, capacity and regularization.`
      : `The train–validation gap is ${gap.toFixed(1)} points. Follow both curves over several epochs before judging how well the model generalizes.`)
  );
}
