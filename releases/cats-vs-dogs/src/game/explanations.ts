import type { ContextHint, Experiment, Explanation } from "../types/game";
import {
  AUGMENTATIONS,
  BATCHES,
  CLEANING,
  LOSSES,
  OPTIMIZERS,
  PACKAGES,
  PRESETS,
  SCHEDULERS,
} from "./catalog";
function entry(
  title: string,
  purpose: string,
  pros: string[],
  cons: string[],
  affects: string[],
  range?: string,
  bestWhen?: string[],
): Explanation {
  return { title, purpose, pros, cons, affects, typicalRange: range, bestWhen };
}
export const explanations: Record<string, Explanation> = {
  observatory: entry(
    "Interactive training visualization",
    "Keep the network and learning curves visible while you work. Every configuration edit refreshes a free simulated forecast and explains the change. Select layers, training phases and epochs to explore the process.",
    [
      "Connect decisions to their simulated effects",
      "Compare an edit or pinned baseline without spending budget",
      "Pause and step through saved or live epochs",
    ],
    [
      "Signal flow and representative units are illustrative; no real weights, activations or gradients are computed",
      "Forecasts use the same approximate simulator as the game",
    ],
    ["Understanding", "Experiment planning", "Playback"],
  ),
  "nav.overview": entry(
    "Lab overview",
    "Your workspace for the current contract, budget, and experiment pipeline.",
    ["See the whole experiment at a glance"],
    ["Summary values cannot show every tradeoff"],
    ["Workflow", "Budget"],
  ),
  "nav.data": entry(
    "Dataset studio",
    "Choose what your model gets to learn from. Acquire, inspect, clean, split and augment your images.",
    ["Better data can improve generalization"],
    ["Data acquisition and cleaning use your fixed budget"],
    ["Accuracy", "Generalization", "Budget"],
  ),
  "nav.model": entry(
    "Model builder",
    "Choose a CNN preset or edit its layers to define how images become predictions.",
    ["Match capacity to the problem"],
    ["More capacity uses more memory and can overfit"],
    ["Parameters", "VRAM", "Latency"],
  ),
  "nav.training": entry(
    "Training room",
    "Set how the network learns, review the cost, and explicitly start an experiment.",
    ["Test a learning strategy"],
    ["Every completed epoch costs budget"],
    ["Convergence", "Accuracy", "Budget"],
  ),
  "nav.results": entry(
    "Experiment results",
    "Inspect curves, class-level mistakes and differences between runs.",
    ["Find evidence for your next experiment"],
    ["Repeatedly tuning to validation data can overfit that split"],
    ["Experimentation", "Generalization"],
  ),
  "nav.deploy": entry(
    "Deployment",
    "Select a saved checkpoint and configure its inference behavior before hidden evaluation.",
    ["Test robustness on unseen conditions"],
    ["Submission locks the contract; hidden evaluation may be lower"],
    ["Score", "Latency", "Model size"],
  ),
  budget: entry(
    "Research budget",
    "You begin with $10,000. Dataset purchases, cleaning and completed training epochs reduce it.",
    ["Unspent money contributes to your score"],
    ["Unused funds cannot compensate for missing the accuracy target"],
    ["Budget", "Final score"],
  ),
  contract: entry(
    "Cats vs Dogs contract",
    "Build an image classifier for Pawprint Labs. Hidden accuracy must reach 90%; 95%, 20 ms latency and 50 MB size earn bonuses.",
    ["Clear goals for accuracy and efficiency"],
    ["The hidden set includes unfamiliar conditions"],
    ["Reward", "Accuracy", "Latency"],
  ),
  difficulty: entry(
    "Context hints",
    "Beginner mode explains performance patterns. Standard shows fewer diagnoses; Expert leaves you with the metrics.",
    ["Choose the amount of guidance you want"],
    ["Hints identify patterns, not guaranteed causes"],
    ["Learning experience"],
  ),
  restart: entry(
    "Start a fresh lab",
    "Reset this browser’s saved contract, all experiments and your budget. A confirmation protects your current work.",
    ["Try a different strategy with a clean budget"],
    ["Erases progress after confirmation"],
    ["Saved progress", "Budget"],
  ),
  confirmReset: entry(
    "Confirm lab reset",
    "Permanently replace your current local game with a fresh $10,000 contract.",
    ["Begin another attempt"],
    ["The previous local session cannot be recovered"],
    ["Saved progress"],
  ),
  close: entry(
    "Close panel",
    "Dismiss this explanation or dialog and return to the workspace.",
    ["Keeps the workspace clear"],
    ["Details will no longer stay visible"],
    ["Interface"],
  ),
  pin: entry(
    "Pin explanation",
    "Keep the full explanation in the inspector while you continue working.",
    ["Read advantages, tradeoffs and context"],
    ["Uses space in the inspector"],
    ["Learning experience"],
  ),
  inspect: entry(
    "Inspect example images",
    "Open representative image examples and review the dataset’s quality and coverage. Images illustrate categories; training is simulated.",
    ["Makes data quality easier to understand"],
    ["A few examples do not prove full dataset coverage"],
    ["Data understanding"],
  ),
  samples: entry(
    "Sample count",
    "The number of available images, including the portions reserved for validation and test.",
    ["More distinct examples can improve generalization"],
    ["Duplicates and wrong labels reduce their value"],
    ["Training cost", "Accuracy"],
    "1,000–20,000",
  ),
  balance: entry(
    "Class distribution",
    "The fraction of cat and dog images. An imbalanced model may look accurate while missing the minority class.",
    ["Natural prevalence can be preserved"],
    ["Overall accuracy can hide poor minority recall"],
    ["Cat recall", "Dog recall", "Accuracy"],
  ),
  quality: entry(
    "Label quality",
    "An estimate of how often the image’s assigned species is correct.",
    ["Clean labels provide a reliable learning signal"],
    ["Professional relabeling costs money"],
    ["Generalization", "Validation accuracy"],
  ),
  diversity: entry(
    "Distribution coverage",
    "How varied the dataset is across lighting, breeds, backgrounds and image quality.",
    ["Broader coverage helps with unfamiliar images"],
    ["Harder examples can slow early progress"],
    ["Robustness", "Hidden accuracy"],
  ),
  duplicates: entry(
    "Duplicate images",
    "Repeated or near-identical images provide less new information and may leak across splits.",
    ["They are inexpensive to acquire"],
    ["Can inflate validation confidence and reduce useful sample count"],
    ["Generalization", "Dataset size"],
  ),
  lighting: entry(
    "Lighting coverage",
    "The proportion of daytime and low-light examples in your collection.",
    ["Night examples help represent difficult lighting"],
    ["A small collection may miss important lighting conditions"],
    ["Hidden low-light accuracy"],
  ),
  environment: entry(
    "Environment coverage",
    "A simulated estimate of indoor and outdoor image coverage based on dataset diversity.",
    ["Varied backgrounds discourage shortcuts"],
    ["The estimate does not reveal the hidden test distribution"],
    ["Robustness"],
  ),
  "split.train": entry(
    "Training split",
    "The images whose labels update model weights. Validation and test images do not train the model.",
    ["More training examples can improve learning"],
    ["A larger share leaves fewer images for reliable evaluation"],
    ["Convergence", "Generalization"],
    "50–85%",
  ),
  "split.validation": entry(
    "Validation split",
    "Hold out images to compare experiments and identify the best checkpoint.",
    ["Measures performance on unused examples"],
    ["A tiny split is noisy; repeated tuning can overfit it"],
    ["Checkpoint choice", "Evaluation confidence"],
    "10–25%",
  ),
  "split.test": entry(
    "Local test split",
    "Reserve a local holdout that is not shown during training. You may inspect it on the results screen. The contract uses another, separate hidden set.",
    ["Provides an additional local check"],
    [
      "Looking repeatedly can bias your decisions; it is not the final hidden evaluation",
    ],
    ["Evaluation confidence"],
    "10–20%",
  ),
  resolution: entry(
    "Image resolution",
    "Resize inputs to this square pixel dimension. Higher resolution retains more detail.",
    ["Preserves small features"],
    ["Compute and memory grow roughly with the number of pixels"],
    ["VRAM", "Cost", "Latency"],
    "64–256 pixels",
  ),
  normalization: entry(
    "Normalization",
    "Choose how pixel values are scaled before the network processes them.",
    ["Standardized values make optimization more stable"],
    ["The transformation must also be applied at inference"],
    ["Convergence", "Stability"],
  ),
  sampling: entry(
    "Sampling strategy",
    "Choose ordinary random sampling or balanced batches that expose both classes equally during training.",
    ["Balanced sampling protects minority-class learning"],
    ["Oversampling repeats examples and cannot add missing variety"],
    ["Class recall", "Generalization"],
  ),
  architecture: entry(
    "CNN architecture",
    "Convolutional networks learn visual patterns using local filters, nonlinearities and pooling.",
    ["Well suited to image classification"],
    ["Large CNNs can memorize small datasets"],
    ["Accuracy", "Parameters", "VRAM"],
  ),
  parameters: entry(
    "Trainable parameters",
    "The weights and biases adjusted during training. This is calculated directly from your architecture.",
    ["More capacity can represent complex patterns"],
    ["More parameters increase model size and overfitting risk"],
    ["Capacity", "Model size", "Compute"],
  ),
  vram: entry(
    "GPU memory estimate",
    "Memory needed for parameters, optimizer state and intermediate activations at your batch size and resolution.",
    ["Larger GPUs permit larger batches and models"],
    ["Exceeding available memory causes a failed allocation"],
    ["Training feasibility", "Hardware cost"],
  ),
  size: entry(
    "Model size",
    "Storage for trained parameters. Full precision uses four bytes per parameter; deployment compression changes this.",
    ["Small models are easier to store and distribute"],
    ["Compression can reduce accuracy"],
    ["Deployment", "Efficiency bonus"],
  ),
  latency: entry(
    "Inference latency",
    "Estimated time to classify an image using the selected deployment settings.",
    ["Low latency improves real-time use"],
    ["Fast hardware and compression have tradeoffs"],
    ["Latency bonus", "Final score"],
    "≤20 ms for bonus",
  ),
  cost: entry(
    "Training cost",
    "Estimated cost for all configured epochs, data volume, architecture, resolution and hardware. Funds are reserved on start; unused epochs are refunded.",
    ["You see the spend before committing"],
    ["More experiments leave less money for data"],
    ["Budget", "Experiment count"],
  ),
  preset: entry(
    "Architecture preset",
    "Load a known CNN layout. You can then edit every layer yourself.",
    ["Provides a comprehensible starting point"],
    ["Replaces the architecture you have currently configured"],
    ["Parameters", "Architecture"],
  ),
  "layer.conv": entry(
    "2D convolution",
    "Slide learnable filters across an image to detect local features such as edges, textures and shapes.",
    ["Shares weights across image locations"],
    ["Many filters use more memory and compute"],
    ["Capacity", "Parameters", "VRAM"],
  ),
  "layer.relu": entry(
    "Activation",
    "Apply a nonlinear function after a layer so the network can represent more than linear patterns.",
    ["Makes complex features learnable"],
    ["ReLU units can stop responding; alternatives have different costs"],
    ["Learning", "Convergence"],
  ),
  "layer.pool": entry(
    "Max pooling",
    "Downsample spatial features by retaining local maxima.",
    ["Reduces spatial memory and compute"],
    ["Discards some positional and fine-grained detail"],
    ["VRAM", "Latency"],
  ),
  "layer.norm": entry(
    "Batch normalization",
    "Normalize internal activations using batch statistics.",
    ["Can stabilize optimization"],
    ["Small batches give noisy statistics"],
    ["Convergence", "Stability"],
  ),
  "layer.dropout": entry(
    "Architecture dropout",
    "Add a dropout layer. The configured training dropout rate is used for its simulated regularization effect.",
    ["Can limit memorization"],
    ["Too much can prevent fitting the training data"],
    ["Generalization", "Convergence"],
  ),
  "layer.global": entry(
    "Global average pooling",
    "Average each feature map into one value before classification.",
    ["Keeps the classifier compact"],
    ["Loses precise spatial positions"],
    ["Parameters", "Model size"],
  ),
  "layer.dense": entry(
    "Dense layer",
    "Connect every input feature to every output. The final layer needs 2 outputs: cat and dog.",
    ["Combines learned features into predictions"],
    ["Large dense layers add many parameters"],
    ["Output classes", "Model size"],
  ),
  "layer.add": entry(
    "Add a layer",
    "Insert a layer before the final output. The architecture must retain a convolution, global pool and two-output dense layer.",
    ["Experiment with network capacity"],
    ["Poor layer choices can make the architecture invalid"],
    ["Architecture", "Compute"],
  ),
  "layer.remove": entry(
    "Remove selected layer",
    "Delete this block from the model. Architecture validation runs before training.",
    ["Simplifies the model"],
    ["Removing required layers blocks training"],
    ["Capacity", "Architecture validity"],
  ),
  "layer.move": entry(
    "Reorder layer",
    "Move the selected layer one position through the visual network.",
    ["Change how features are processed"],
    ["Invalid ordering can prevent training"],
    ["Architecture", "Parameters"],
  ),
  filters: entry(
    "Layer width",
    "Convolutional width is the number of learned filters; dense width is the number of outputs.",
    ["More features increase representational capacity"],
    ["Wider layers increase parameters and memory"],
    ["Parameters", "VRAM"],
    "16–512 filters",
  ),
  kernel: entry(
    "Kernel size",
    "The spatial width and height of a convolutional filter.",
    ["Larger kernels see a wider local area"],
    ["Parameter count grows with kernel area"],
    ["Parameters", "Feature extraction"],
    "3×3 or 5×5",
  ),
  stride: entry(
    "Stride",
    "The number of pixels a filter moves per step.",
    ["A larger stride reduces activation memory"],
    ["Downsampling can lose details"],
    ["VRAM", "Resolution"],
    "1–2",
  ),
  padding: entry(
    "Padding",
    "Same padding preserves spatial dimensions; Valid padding omits edges the filter cannot fully cover.",
    ["Same padding retains edge information"],
    ["Valid padding shrinks feature maps"],
    ["Spatial size", "Memory"],
  ),
  activation: entry(
    "Activation function",
    "ReLU, GELU and Sigmoid change how activations respond to their input.",
    ["Nonlinearity supports complex patterns"],
    ["Saturating functions can slow learning"],
    ["Convergence", "Capacity"],
  ),
  optimizer: entry(
    "Optimizer",
    "The rule used to update weights from training gradients.",
    ["Different methods suit different learning dynamics"],
    ["No optimizer fixes bad labels or insufficient data"],
    ["Convergence", "Stability"],
  ),
  lr: entry(
    "Learning rate",
    "The size of each weight update. This slider is logarithmic, so equal steps multiply the learning rate.",
    ["A suitable rate learns efficiently"],
    ["Too high can diverge; too low may not converge in time"],
    ["Convergence", "Stability"],
    "0.000001–1",
  ),
  batch: entry(
    "Batch size",
    "The number of training images used for one weight update.",
    ["Larger batches improve throughput"],
    ["Larger batches use more VRAM and may generalize less well"],
    ["VRAM", "Throughput", "Generalization"],
    "8–512",
  ),
  epochs: entry(
    "Training epochs",
    "One epoch is a pass through the entire training split.",
    ["More passes can improve convergence"],
    ["Extra epochs cost money and can overfit"],
    ["Cost", "Convergence", "Overfitting"],
    "10–80",
  ),
  loss: entry(
    "Loss function",
    "A differentiable measure of prediction error that the optimizer minimizes.",
    ["A task-matched loss gives useful gradients"],
    ["An unsuitable loss can slow learning and lower accuracy"],
    ["Convergence", "Accuracy"],
  ),
  dropout: entry(
    "Dropout",
    "Randomly disable a proportion of activations during training to discourage memorization.",
    [
      "Can improve generalization",
      "Useful when train accuracy exceeds validation",
    ],
    ["Can slow convergence", "Too much causes underfitting"],
    ["Generalization", "Training speed"],
    "0.1–0.5",
    ["A wide train–validation gap"],
  ),
  weightDecay: entry(
    "Weight decay",
    "Penalize overly large weights to encourage simpler solutions.",
    ["Can reduce overfitting"],
    ["Too much limits the model’s ability to fit"],
    ["Generalization", "Training fit"],
    "0.00001–0.01",
  ),
  momentum: entry(
    "Momentum",
    "Carry part of previous gradients into the next SGD update.",
    ["Can speed movement in consistent directions"],
    ["May overshoot with a high learning rate"],
    ["Convergence", "Stability"],
    "0.8–0.99",
  ),
  scheduler: entry(
    "Learning-rate schedule",
    "Change the learning rate over the course of training.",
    ["Can help refine weights after initial progress"],
    ["Decaying too early can slow learning"],
    ["Convergence", "Final accuracy"],
  ),
  warmup: entry(
    "Warmup epochs",
    "Gradually increase the learning rate from a small value during the first epochs.",
    ["Gentler initial updates can stabilize a run"],
    ["Uses part of the epoch budget at lower learning rates"],
    ["Stability", "Convergence"],
    "0–10 epochs",
  ),
  earlyStopping: entry(
    "Early stopping",
    "End training when validation accuracy fails to improve for the chosen patience.",
    ["Saves unused compute and budget"],
    ["May stop during a temporary plateau"],
    ["Budget", "Checkpoints"],
  ),
  patience: entry(
    "Early-stopping patience",
    "Number of epochs to allow without meaningful validation improvement.",
    ["Longer patience lets a model recover"],
    ["Long patience spends more on a stalled experiment"],
    ["Cost", "Training duration"],
    "3–10 epochs",
  ),
  clip: entry(
    "Gradient clipping",
    "Limit extreme gradient updates. Zero disables clipping.",
    ["Can reduce instability"],
    ["Aggressive clipping can slow useful updates"],
    ["Stability", "Convergence"],
    "0 disabled; 1–5 enabled",
  ),
  seed: entry(
    "Random seed",
    "The starting state of the deterministic random generator. Identical configuration and seed reproduce the same curves.",
    ["Allows fair comparisons"],
    ["One seed does not measure variability across all runs"],
    ["Reproducibility", "Curve noise"],
  ),
  hardware: entry(
    "Training hardware",
    "Choose the lab’s 8 GB GPU or rent a 16 GB cloud GPU.",
    ["More VRAM accommodates larger workloads"],
    ["Cloud epochs cost 1.8 times as much"],
    ["VRAM", "Cost"],
  ),
  "train.start": entry(
    "Start training",
    "Approve the displayed estimated cost and start the simulated experiment. Configuration is snapshotted for this run.",
    ["Produces metrics and a checkpoint at each epoch"],
    ["Completed epochs spend budget; poor settings can fail"],
    ["Budget", "Experiment history"],
  ),
  "train.pause": entry(
    "Pause training",
    "Pause epoch playback without changing your completed checkpoints or budget.",
    ["Gives you time to inspect the current curves"],
    ["The experiment will not advance until resumed"],
    ["Playback"],
  ),
  "train.resume": entry(
    "Resume training",
    "Continue the paused experiment with the same configuration.",
    ["Continue learning from the current epoch"],
    ["Additional completed epochs spend reserved budget"],
    ["Playback", "Budget"],
  ),
  "train.stop": entry(
    "Stop training",
    "End the current experiment. Keep completed checkpoints and refund unrun epochs.",
    ["Preserves the usable work already done"],
    ["A partially trained model may not have converged"],
    ["Budget", "Checkpoints"],
  ),
  accuracy: entry(
    "Accuracy",
    "The percentage of examples assigned the correct class.",
    ["Easy to interpret"],
    ["Can hide poor minority-class performance"],
    ["Contract outcome", "Score"],
  ),
  trainAccuracy: entry(
    "Training accuracy",
    "Accuracy on examples used to update the weights.",
    ["Shows whether the model fits the training data"],
    ["A high value can indicate memorization rather than generalization"],
    ["Underfitting diagnosis"],
  ),
  validationAccuracy: entry(
    "Validation accuracy",
    "Accuracy on held-out validation images at each epoch.",
    ["Helps compare experiments and checkpoints"],
    ["Does not guarantee performance under distribution shift"],
    ["Checkpoint choice", "Experiment comparison"],
  ),
  localTest: entry(
    "Local holdout evaluation",
    "Run a deterministic diagnostic on your reserved local test split. It is separate from both validation and the final hidden evaluation.",
    ["Provides a fresh local diagnostic"],
    ["Repeated inspection makes it less independent"],
    ["Evaluation confidence"],
  ),
  lossMetric: entry(
    "Learning curves",
    "Loss is the model’s error signal; lower is better. Accuracy is correct predictions; higher is better.",
    ["The curve shape reveals learning behavior"],
    ["Noisy validation curves can make individual epochs misleading"],
    ["Convergence diagnosis", "Checkpoint choice"],
  ),
  precision: entry(
    "Precision",
    "Of predictions for a class, the fraction that are correct. Here this is a simulated class-averaged estimate.",
    ["Highlights false-positive behavior"],
    ["Does not capture missed positives alone"],
    ["Error understanding"],
  ),
  recall: entry(
    "Recall",
    "Of actual examples of a class, the fraction correctly identified.",
    ["Reveals missed minority-class examples"],
    ["Does not measure how reliable positive predictions are"],
    ["Class performance"],
  ),
  f1: entry(
    "F1 score",
    "The harmonic mean of precision and recall.",
    ["Balances false positives and missed examples"],
    ["Can conceal which kind of mistake dominates"],
    ["Model comparison"],
  ),
  confusion: entry(
    "Confusion matrix",
    "Rows show actual species; columns show predicted species. Off-diagonal cells are mistakes. Counts are simulated from class recalls.",
    ["Shows which class the model confuses"],
    ["One matrix cannot show robustness across all conditions"],
    ["Cat recall", "Dog recall"],
  ),
  mistakes: entry(
    "Sample mistakes",
    "Representative difficult conditions illustrate likely failure modes from your configuration. These are simulated categories, not predictions on the displayed photos.",
    ["Connects dataset coverage to failure patterns"],
    ["A handful of examples cannot explain every error"],
    ["Robustness", "Data decisions"],
  ),
  history: entry(
    "Experiment history",
    "Every run records its configuration, realized cost, curves and completed checkpoints.",
    ["Compare your decisions with measured results"],
    ["Many changes at once make causality hard to infer"],
    ["Iteration", "Budget"],
  ),
  compare: entry(
    "Compare experiments",
    "Choose two saved runs to compare their configurations, validation accuracy and cost.",
    ["Learn from controlled changes"],
    ["Different seeds or multiple changes can confound conclusions"],
    ["Experimentation"],
  ),
  checkpoint: entry(
    "Checkpoint selection",
    "A saved model state at a completed epoch. Select the state to deploy; the last epoch is not always the best.",
    ["Keep a stronger earlier model"],
    ["Validation-selected checkpoints may still struggle on hidden data"],
    ["Hidden accuracy", "Score"],
  ),
  quantization: entry(
    "Quantization",
    "Store weights using FP32, FP16 or INT8 precision.",
    ["Lower precision reduces model size and estimated latency"],
    ["INT8 adds a small simulated accuracy penalty"],
    ["Size", "Latency", "Accuracy"],
  ),
  pruning: entry(
    "Pruning",
    "Remove a proportion of model weights for a smaller and faster deployment.",
    ["Reduces storage and compute"],
    ["Aggressive pruning lowers accuracy"],
    ["Size", "Latency", "Accuracy"],
    "0–50%",
  ),
  inferenceHardware: entry(
    "Inference hardware",
    "Choose CPU, lab GPU or an edge accelerator for deployment.",
    ["Accelerators reduce inference latency"],
    ["Hardware changes the efficiency tradeoff"],
    ["Latency", "Final score"],
  ),
  inferenceBatch: entry(
    "Inference batch size",
    "The number of images processed together at deployment.",
    ["Can improve throughput on real hardware"],
    ["Adds per-request waiting and simulated latency"],
    ["Latency"],
    "1–16",
  ),
  submit: entry(
    "Submit to hidden evaluation",
    "Finalize this contract using the selected checkpoint and deployment settings. Unseen lighting, breeds, occlusion and image quality are evaluated.",
    ["Reveals robustness and final score"],
    ["Submission is final for this lab; start a new lab to try again"],
    ["Contract completion", "Reward", "Score"],
  ),
  score: entry(
    "Final score",
    "Points combine hidden accuracy, robustness, model efficiency, latency and remaining budget. Maximum score is 10,000.",
    ["Rewards more than accuracy alone"],
    ["A high score still needs 90% hidden accuracy to pass"],
    ["Contract completion"],
  ),
  reward: entry(
    "Contract reward",
    "Passing earns $5,000, plus $1,500 for 95% hidden accuracy and $500 each for latency and size bonuses. This is recorded as the contract payout.",
    ["Rewards a robust and efficient model"],
    ["A failed accuracy requirement earns no payout"],
    ["Contract outcome"],
  ),
};
for (const p of PACKAGES)
  explanations[`package.${p.id}`] = entry(
    p.name,
    `${p.samples.toLocaleString()} images for $${p.cost.toLocaleString()}. ${p.subtitle}`,
    p.pros,
    p.cons,
    ["Data quality", "Generalization", "Budget"],
  );
for (const p of PRESETS)
  explanations[`preset.${p.name}`] = entry(
    p.name,
    `A ${p.layers.filter((l) => l.kind === "conv").length}-convolution CNN preset. Selecting it replaces the current layer configuration.`,
    [
      p.name === "Tiny CNN"
        ? "Fast and inexpensive to train"
        : "Greater feature capacity",
    ],
    [
      p.name === "Large CNN"
        ? "High memory and overfitting risk"
        : "Capacity may not suit your dataset",
    ],
    ["Parameters", "Accuracy", "Compute"],
  );
const augText: Record<string, [string, string, string]> = {
  flip: [
    "Mirror images left to right.",
    "Makes orientation less important",
    "Can erase meaningful left–right patterns in other tasks",
  ],
  crop: [
    "Randomly keep a subregion of each image.",
    "Builds robustness to framing and partial visibility",
    "Strong cropping can remove the animal",
  ],
  rotation: [
    "Rotate images by up to the chosen angle.",
    "Helps handle camera orientation",
    "Extreme angles create unrealistic scenes",
  ],
  brightness: [
    "Vary the brightness of training images.",
    "Helps with changing lighting",
    "Strong changes can hide useful details",
  ],
  contrast: [
    "Vary the difference between bright and dark pixels.",
    "Broadens image-quality coverage",
    "Extreme contrast destroys texture",
  ],
  noise: [
    "Add random Gaussian pixel noise.",
    "Improves tolerance to degraded images",
    "Too much noise can hide the signal",
  ],
  jitter: [
    "Vary colors and saturation.",
    "Reduces dependence on a narrow color palette",
    "Strong jitter can make unrealistic animals",
  ],
};
for (const a of AUGMENTATIONS) {
  const x = augText[a.id];
  explanations[`aug.${a.id}`] = entry(
    a.name,
    x[0],
    [x[1]],
    [x[2], "Adds preprocessing cost and training difficulty"],
    ["Diversity", "Robustness", "Compute"],
    `0–${a.max}${a.unit}`,
  );
}
for (const c of CLEANING)
  explanations[`clean.${c.id}`] = entry(
    c.name,
    `${c.description} Costs $${c.cost}.`,
    ["Improves the useful training signal"],
    ["Uses budget that could fund another experiment"],
    ["Data quality", "Budget"],
  );
const optDetails: Record<string, [string, string, string]> = {
  SGD: [
    "Update weights directly from the batch gradient.",
    "Simple, low optimizer overhead",
    "Sensitive to the learning rate and may converge slowly",
  ],
  "SGD + Momentum": [
    "Smooth SGD updates using accumulated gradient direction.",
    "Faster convergence in consistent directions",
    "Can overshoot at high learning rates",
  ],
  Adam: [
    "Adapt update sizes using first and second gradient moments.",
    "Often converges quickly with limited tuning",
    "Can overfit and uses extra optimizer memory",
  ],
  AdamW: [
    "Adam with weight decay separated from the adaptive update.",
    "Makes weight decay more consistent",
    "Still requires a suitable learning rate",
  ],
  RMSProp: [
    "Scale gradients using a moving average of their squared magnitude.",
    "Handles uneven gradient scales",
    "May need careful learning-rate tuning",
  ],
};
for (const s of OPTIMIZERS) {
  const x = optDetails[s];
  explanations[`optimizer.${s}`] = entry(
    s,
    x[0],
    [x[1]],
    [x[2]],
    ["Convergence", "Stability"],
  );
}
for (const n of BATCHES)
  explanations[`batch.${n}`] = entry(
    `Batch size ${n}`,
    `Use ${n} images per weight update.`,
    [n >= 128 ? "High throughput" : "Lower activation memory"],
    [
      n >= 128
        ? "Higher memory use and possible generalization penalty"
        : "More updates and lower throughput",
    ],
    ["VRAM", "Cost", "Generalization"],
  );
for (const s of SCHEDULERS)
  explanations[`schedule.${s}`] = entry(
    s,
    s === "None"
      ? "Keep the chosen learning rate fixed."
      : s === "Step decay"
        ? "Halve the learning rate at regular epoch intervals."
        : s === "Cosine decay"
          ? "Reduce the learning rate smoothly along a cosine curve."
          : "Reduce the learning rate after validation progress stalls.",
    [
      s === "None"
        ? "Predictable update size"
        : "Refines updates later in training",
    ],
    [
      s === "None"
        ? "May overshoot near convergence"
        : "May slow progress if reduced too early",
    ],
    ["Convergence", "Final accuracy"],
  );
for (const s of LOSSES)
  explanations[`loss.${s}`] = entry(
    s,
    s === "MSE"
      ? "Treat class scores as regression targets and minimize squared error."
      : "Penalize incorrect class probabilities using negative log likelihood.",
    [
      s === "MSE"
        ? "Simple and technically works for class targets"
        : "Matches probabilistic classification",
    ],
    [
      s === "MSE"
        ? "Usually weaker gradients for classification"
        : "Confident wrong labels can create strong gradients",
    ],
    ["Convergence", "Accuracy"],
  );

export function contextHints(
  key: string,
  experiment: Experiment | undefined,
  difficulty: string,
): ContextHint[] {
  if (difficulty === "Expert" || !experiment) return [];
  const m = experiment.result.finalMetrics;
  const hints: ContextHint[] = [];
  if (
    experiment.result.status === "oom" &&
    ["vram", "batch", "resolution", "hardware"].includes(key)
  )
    hints.push({
      severity: "warning",
      message:
        "This experiment exceeded GPU memory. Batch size, image resolution, architecture and available VRAM interact.",
    });
  if (difficulty === "Standard") return hints;
  if (
    m.trainAccuracy - m.validationAccuracy > 6 &&
    ["dropout", "weightDecay", "epochs", "architecture", "diversity"].includes(
      key,
    )
  )
    hints.push({
      severity: "warning",
      message: `Training accuracy is ${(m.trainAccuracy - m.validationAccuracy).toFixed(1)} points above validation. This pattern is commonly associated with overfitting. Regularization and broader data are often relevant in this situation.`,
    });
  if (
    m.trainAccuracy < 80 &&
    ["lr", "epochs", "dropout", "architecture"].includes(key)
  )
    hints.push({
      severity: "info",
      message:
        "Both training and validation accuracy are low. This often indicates insufficient capacity, slow convergence or excessive regularization.",
    });
  if (
    experiment.result.status === "diverged" &&
    ["lr", "clip", "optimizer"].includes(key)
  )
    hints.push({
      severity: "warning",
      message:
        "The previous run’s loss grew rapidly. Large updates can destabilize training; clipping and learning rate affect update magnitude.",
    });
  return hints;
}
// Each concrete select value has its own inspector entry, not just the parent field.
import { OPTION_SETS } from "./catalog";
for (const [field, options] of Object.entries(OPTION_SETS))
  for (const value of options) {
    const base = explanations[field];
    if (!base) throw new Error(`Missing explanation for ${field}`);
    explanations[`${field}.${value}`] = {
      ...base,
      title: `${base.title}: ${value}`,
      purpose: `${value} is the selected ${base.title.toLowerCase()}. ${base.purpose}`,
    };
  }
Object.assign(explanations, {
  "normalization.None": entry(
    "No normalization",
    "Feed raw pixel values into the network without rescaling.",
    ["Preserves original numeric values"],
    ["Optimization is slower and less stable at the same learning rate"],
    ["Convergence"],
  ),
  "normalization.Scale to 0–1": entry(
    "Scale to 0–1",
    "Divide pixel intensities by 255 so inputs lie between zero and one.",
    ["Reduces input scale and supports stable updates"],
    ["Does not center each channel around zero"],
    ["Convergence", "Input scale"],
  ),
  "normalization.Standardize": entry(
    "Standardize pixels",
    "Center pixel channels and scale their variation using training statistics.",
    ["Often supports faster convergence"],
    ["Requires retaining training statistics for inference"],
    ["Convergence", "Deployment"],
  ),
  "sampling.Random": entry(
    "Random sampling",
    "Draw training images without changing the dataset’s class proportions.",
    ["Reflects the collection’s natural class mix"],
    ["Imbalanced data produces fewer minority-class updates"],
    ["Class recall"],
  ),
  "sampling.Class balanced": entry(
    "Class-balanced sampling",
    "Give both species equal representation in training batches.",
    ["Reduces the penalty from class imbalance"],
    ["Repeated examples cannot replace missing diversity"],
    ["Minority recall", "Generalization"],
  ),
  "quantization.FP32": entry(
    "FP32 precision",
    "Use four bytes per weight for the reference full-precision model.",
    ["No compression accuracy penalty"],
    ["Largest storage footprint and slowest simulated precision"],
    ["Size", "Latency", "Accuracy"],
  ),
  "quantization.FP16": entry(
    "FP16 precision",
    "Use two bytes per weight, halving the parameter storage.",
    ["Smaller and faster than FP32"],
    ["A small simulated 0.1-point accuracy penalty"],
    ["Size", "Latency", "Accuracy"],
  ),
  "quantization.INT8": entry(
    "INT8 precision",
    "Use one byte per weight for a compact integer model.",
    ["One quarter of FP32 weight storage", "Lower estimated latency"],
    ["A simulated 0.75-point accuracy penalty"],
    ["Size", "Latency", "Accuracy"],
  ),
  "activation.ReLU": entry(
    "ReLU",
    "Keep positive activations and replace negative values with zero.",
    ["Simple and computationally inexpensive"],
    ["Some units can stop responding"],
    ["Convergence"],
  ),
  "activation.GELU": entry(
    "GELU",
    "Apply a smooth, input-dependent gate to activations.",
    ["Smoother updates provide a small simulated convergence benefit"],
    ["More complex than ReLU"],
    ["Convergence"],
  ),
  "activation.Sigmoid": entry(
    "Sigmoid",
    "Squash activations into values between zero and one.",
    ["Bounded activations can be interpretable"],
    [
      "Saturation slows gradients; hidden CNN layers perform worse in this simulator",
    ],
    ["Convergence", "Accuracy"],
  ),
});

import { visualizationExplanations } from "./visualizationExplanations";
Object.assign(explanations, visualizationExplanations);

export const UI_EXPLANATION_KEYS = Object.keys(explanations);
