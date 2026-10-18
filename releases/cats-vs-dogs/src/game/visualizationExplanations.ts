import type { Explanation } from "../types/game";
const explain = (
  title: string,
  purpose: string,
  pros: string[],
  cons: string[],
  affects: string[],
): Explanation => ({ title, purpose, pros, cons, affects });
export const visualizationExplanations: Record<string, Explanation> = {
  "viz.source": explain(
    "Visualization source",
    "Follow the workspace automatically, inspect the current draft forecast, or replay a saved experiment. A draft is an uncharged simulation, not a completed experiment.",
    [
      "Connect editing decisions to their effects",
      "Inspect saved evidence without retraining",
    ],
    ["Forecasts are approximate and do not reveal hidden-test accuracy"],
    ["Displayed network", "Displayed curves", "Interpretation"],
  ),
  "viz.expand": explain(
    "Explore the visualization",
    "Expand the dock to inspect layer details, training phases and recent changes. Compact it to return more room to the workspace.",
    ["More space for explanations and detailed controls"],
    ["The expanded dock occupies more screen space"],
    ["Workspace visibility", "Learning detail"],
  ),
  "viz.layers": explain(
    "Show every layer",
    "Switch between grouped convolution blocks and the individual activation, pooling, normalization and dropout operations.",
    ["Makes the complete sequence visible"],
    ["More layers require horizontal scrolling"],
    ["Network detail", "Layer inspection"],
  ),
  "viz.play": explain(
    "Visualization playback",
    "Play or pause an epoch replay. During a live run, this controls actual training playback; additional completed epochs consume the compute already reserved for the run.",
    ["Inspect the learning trajectory at your own pace"],
    [
      "Resuming a live experiment continues paid epochs; replaying a saved run does not retrain it",
    ],
    ["Playback", "Completed live epochs", "Budget"],
  ),
  "viz.step": explain(
    "Advance one epoch",
    "When live training is paused, compute exactly one additional simulated epoch. Otherwise advance the replay by one saved or forecast epoch.",
    ["Inspect a single update in the curve"],
    ["A live step uses compute and cannot undo completed training"],
    ["Epoch metrics", "Checkpoints", "Live compute spend"],
  ),
  "viz.epoch": explain(
    "Inspect an epoch",
    "Move through the available trajectory to inspect that epoch’s metrics. Seeking changes the view, not the trained weights or submitted checkpoint.",
    ["Connect a curve position to an explanation"],
    [
      "Replaying an earlier epoch does not roll back a live run or automatically select a deployment checkpoint",
    ],
    ["Displayed metrics", "Epoch explanation"],
  ),
  "viz.speed": explain(
    "Playback speed",
    "Change how quickly epochs appear. The same seed and configuration still generate the same curves and per-epoch cost.",
    ["Slow down to inspect; speed up to iterate"],
    ["Fast playback makes individual changes harder to watch"],
    ["Animation timing", "Epoch playback"],
  ),
  "viz.live": explain(
    "Follow the latest epoch",
    "Return the visualization to the most recently completed live epoch after inspecting an earlier one.",
    ["Keep the chart aligned with current progress"],
    ["Leaves the earlier inspection position"],
    ["Displayed epoch", "Live monitoring"],
  ),
  "viz.baseline": explain(
    "Pin a comparison baseline",
    "Keep the current draft as a reference while making further changes. Unpin to compare against the most recent edit instead.",
    ["Measure combined changes against a stable reference"],
    ["Changing several settings at once makes causes harder to separate"],
    ["Before-and-after comparison", "Forecast differences"],
  ),
  "viz.history": explain(
    "Recent-change journal",
    "Review recent data, architecture, training and deployment edits and their text explanations. This journal records edits separately from paid experiments.",
    ["Trace which choices changed the displayed behavior"],
    ["A recent-edit list is not evidence of a completed training run"],
    ["Understanding changes", "Experiment planning"],
  ),
  "viz.phase.forward": explain(
    "Forward prediction",
    "Pass image features through the configured layers to produce cat and dog scores. The moving signals illustrate the concept rather than measured neuron activations.",
    ["Makes the direction of prediction understandable"],
    ["Representative units cannot display every activation in a real network"],
    ["Predictions", "Feature representation"],
  ),
  "viz.phase.loss": explain(
    "Measure loss",
    "Compare model output scores with the known training labels using the selected loss function.",
    ["Turns errors into a signal the optimizer can use"],
    ["Low training loss alone does not prove good generalization"],
    ["Gradient signal", "Training loss"],
  ),
  "viz.phase.backward": explain(
    "Backpropagation",
    "Carry derivatives of the loss backward through the network to determine how each trainable weight influences error.",
    ["Provides an efficient direction for learning"],
    ["Large or saturated gradients can make optimization unstable or slow"],
    ["Gradients", "Convergence", "Stability"],
  ),
  "viz.phase.update": explain(
    "Update the weights",
    "Apply the optimizer, learning rate, schedule and regularization to adjust trainable weights after a batch.",
    ["Repeated updates can improve fit"],
    ["Large updates can diverge; small updates may need more time"],
    ["Weights", "Convergence", "Training accuracy"],
  ),
  "viz.phase.validate": explain(
    "Validate without learning",
    "Measure the model on held-out validation images after an epoch, without updating weights and with dropout disabled.",
    ["Provides evidence beyond training examples"],
    ["Repeatedly tuning to validation may overfit this holdout"],
    ["Validation accuracy", "Checkpoint decisions"],
  ),
};
for (const speed of [0.25, 0.5, 1, 2, 4])
  visualizationExplanations[`viz.speed.${speed}`] = {
    ...visualizationExplanations["viz.speed"],
    title: `Playback at ${speed}×`,
    purpose: `Display epochs at ${speed} times normal speed. ${visualizationExplanations["viz.speed"].purpose}`,
  };
