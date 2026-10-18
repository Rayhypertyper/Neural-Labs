import type { EpochMetrics } from "../types/game";
export type DigitConfig = {
  source: string;
  layers: number;
  width: number;
  dense: number;
  dropout: number;
  lr: number;
  epochs: number;
  batch: number;
  shift: number;
  rotation: number;
  normalization: boolean;
};
export const INITIAL_DIGITS: DigitConfig = {
  source: "",
  layers: 2,
  width: 32,
  dense: 64,
  dropout: 0.2,
  lr: 0.001,
  epochs: 20,
  batch: 64,
  shift: 10,
  rotation: 10,
  normalization: true,
};
export const DIGIT_SOURCES = [
  {
    id: "web",
    name: "Crowdsourced digits",
    images: 25000,
    quality: 0.945,
    diversity: 0.8,
    cost: 1000,
  },
  {
    id: "curated",
    name: "Curated handwriting",
    images: 60000,
    quality: 0.995,
    diversity: 0.93,
    cost: 3500,
  },
  {
    id: "small",
    name: "Small clean collection",
    images: 8000,
    quality: 0.998,
    diversity: 0.65,
    cost: 600,
  },
];
export function estimateDigits(c: DigitConfig) {
  let params = 0,
    channels = 1,
    side = 28;
  for (let i = 0; i < c.layers; i++) {
    const width = c.width * 2 ** i;
    params += (9 * channels + 1) * width;
    channels = width;
    side = Math.max(1, Math.floor(side / 2));
  }
  params += (side * side * channels + 1) * c.dense + (c.dense + 1) * 10;
  const source = DIGIT_SOURCES.find((s) => s.id === c.source);
  const perEpoch = Math.ceil(
    ((source?.images ?? 0) / 60000) *
      (params / 200000) ** 0.35 *
      18 *
      (c.batch < 32 ? 1.2 : 1),
  );
  const memory =
    (params * 16) / 1e9 + (c.batch * c.width * 28 * 28 * 4) / 1e9 + 0.5;
  return { params, cost: perEpoch * c.epochs, perEpoch, memory };
}
export function simulateDigits(c: DigitConfig): EpochMetrics[] {
  const source = DIGIT_SOURCES.find((s) => s.id === c.source);
  if (!source) return [];
  const size = estimateDigits(c).params;
  const capacity = Math.min(2.5, Math.log10(Math.max(1, size) / 10000));
  const lrFit = Math.max(0.1, 1 - Math.abs(Math.log10(c.lr / 0.001)) * 0.3);
  const quality =
    93.5 +
    capacity * 1.5 +
    (source.quality - 0.94) * 45 +
    (source.images / 60000) * 0.7;
  const regularization =
    Math.min(1.3, c.dropout * 4) +
    Math.min(0.5, c.shift * 0.03) +
    Math.min(0.5, c.rotation * 0.03);
  return Array.from({ length: c.epochs }, (_, j) => {
    const epoch = j + 1,
      fit = 1 - Math.exp(-epoch * 0.3 * lrFit);
    const overfit =
      Math.max(0, epoch - 12) *
      (source.images < 10000 ? 0.12 : 0.025) *
      (1 - c.dropout);
    const accuracy = Math.max(
      10,
      Math.min(
        99.6,
        (quality + regularization) * fit -
          overfit -
          (c.normalization ? 0 : 5) -
          Math.max(0, c.dropout - 0.5) * 10,
      ),
    );
    const train = Math.min(99.9, accuracy + 1 + overfit);
    const loss = Math.max(0.01, (100 - train) / 65),
      valLoss = Math.max(0.02, (100 - accuracy) / 55);
    return {
      epoch,
      trainAccuracy: train,
      validationAccuracy: accuracy,
      trainLoss: loss,
      validationLoss: valLoss,
      utilization: 80,
      lr: c.lr,
    };
  });
}
export function hiddenDigits(c: DigitConfig, accuracy: number) {
  const source = DIGIT_SOURCES.find((s) => s.id === c.source)!;
  return Math.max(
    10,
    accuracy -
      1.4 -
      (1 - source.diversity) * 3 +
      Math.min(0.5, c.shift * 0.02) +
      Math.min(0.4, c.rotation * 0.02),
  );
}
