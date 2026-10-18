import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Database,
  Eye,
  ImagePlus,
  Layers3,
  Plus,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useGame } from "../store/gameStore";
import { AUGMENTATIONS, CLEANING, PACKAGES, money } from "../game/catalog";
import { validateDataset } from "../game/economy";
import type { AugmentationKey } from "../types/game";
import {
  Button,
  Field,
  SectionHeading,
  Select,
  StageHeading,
  Toggle,
} from "./ui";
import { Explain, Help } from "./Help";
import { CAT_IMAGE, DOG_IMAGE } from "./Overview";
export default function DataStudio() {
  const s = useGame();
  const d = s.dataset;
  const [tab, setTab] = useState("collection");
  const [examples, setExamples] = useState(false);
  const locked = !!s.evaluation || !!s.running;
  const splitTotal = Object.values(d.split).reduce((a, b) => a + b, 0);
  return (
    <>
      <StageHeading
        title="Good data. Better possibilities."
        description="Build the collection your model will learn to see the world through."
        action={
          <span className="simulation-tag">
            <Database size={14} />
            {d.samples.toLocaleString()} images
          </span>
        }
      />
      <div className="workspace-tabs">
        {["collection", "preprocessing", "augmentation"].map((t, i) => (
          <Help
            key={t}
            id={i === 0 ? "nav.data" : i === 1 ? "split.train" : "aug.flip"}
          >
            <button
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          </Help>
        ))}
      </div>
      {tab === "collection" && (
        <>
          <SectionHeading
            title="Dataset marketplace"
            description="Combine collections or start small. Each purchase uses your research budget."
          />
          <div className="marketplace">
            {PACKAGES.map((p, i) => (
              <Help
                key={p.id}
                id={`package.${p.id}`}
                as="div"
                className={`dataset-card ${p.tone}`}
              >
                <div className="dataset-preview">
                  <div className="image-grid">
                    {[CAT_IMAGE, DOG_IMAGE, CAT_IMAGE, DOG_IMAGE].map(
                      (src, j) => (
                        <img
                          src={src}
                          key={j}
                          alt={
                            j % 2
                              ? "Representative dog image"
                              : "Representative cat image"
                          }
                          style={{
                            objectPosition:
                              j === 2
                                ? "25% 30%"
                                : j === 3
                                  ? "75% 20%"
                                  : "center",
                            filter:
                              i === 0 && j === 3
                                ? "brightness(.65)"
                                : undefined,
                          }}
                        />
                      ),
                    )}
                  </div>
                  <span className="dataset-category">{p.tag}</span>
                  <span className="sample-badge">
                    {(p.samples / 1000).toFixed(0)}k IMAGES
                  </span>
                </div>
                <div className="dataset-card-body">
                  <div className="dataset-name">
                    <h3>{p.name}</h3>
                    <Explain id={`package.${p.id}`} />
                  </div>
                  <p>{p.subtitle}</p>
                  <div className="dataset-spec">
                    <span>
                      Label quality <b>{(p.quality * 100).toFixed(1)}%</b>
                    </span>
                    <span>
                      Coverage{" "}
                      <b>
                        {p.diversity > 0.9
                          ? "Broad"
                          : p.diversity > 0.8
                            ? "Diverse"
                            : "Limited"}
                      </b>
                    </span>
                  </div>
                  <div className="dataset-purchase">
                    <strong>{money(p.cost)}</strong>
                    <Button
                      help={`package.${p.id}`}
                      variant={i === 1 ? "primary" : "secondary"}
                      disabled={locked || s.budget < p.cost}
                      onClick={() => s.buy(p.id)}
                    >
                      <Plus size={14} />
                      {d.packages[p.id] ? "Acquire more" : "Acquire"}
                    </Button>
                  </div>
                  {!!d.packages[p.id] && (
                    <span className="acquired-label">
                      <Check size={12} />
                      {d.packages[p.id]} collection
                      {d.packages[p.id] > 1 ? "s" : ""} acquired
                    </span>
                  )}
                </div>
              </Help>
            ))}
          </div>
          <SectionHeading
            title="Inside your collection"
            description={
              d.samples
                ? "A simulated inspection of the data you have acquired."
                : "Acquire your first collection to reveal its strengths and blind spots."
            }
            action={
              <Button
                help="inspect"
                variant="secondary"
                disabled={!d.samples}
                onClick={() => setExamples(true)}
              >
                <Eye size={14} />
                Inspect examples
              </Button>
            }
          />
          <div
            className={`dataset-inspector ${!d.samples ? "unacquired" : ""}`}
          >
            <div className="data-stat">
              <Help id="balance">
                <h4>
                  CLASS BALANCE <Explain id="balance" />
                </h4>
                <div className="split-stat">
                  <strong>
                    {(d.catRatio * 100).toFixed(0)}
                    <small>% cats</small>
                  </strong>
                  <strong>
                    {((1 - d.catRatio) * 100).toFixed(0)}
                    <small>% dogs</small>
                  </strong>
                </div>
                <div className="balance-bar">
                  <i style={{ width: `${d.catRatio * 100}%` }} />
                </div>
              </Help>
            </div>
            <div className="data-stat">
              <Help id="lighting">
                <h4>
                  LIGHTING <Explain id="lighting" />
                </h4>
                <div className="split-stat">
                  <strong>
                    {((1 - d.night) * 100).toFixed(0)}
                    <small>% day</small>
                  </strong>
                  <strong>
                    {(d.night * 100).toFixed(0)}
                    <small>% night</small>
                  </strong>
                </div>
                <div className="balance-bar lighting">
                  <i style={{ width: `${(1 - d.night) * 100}%` }} />
                </div>
              </Help>
            </div>
            <div className="data-stat">
              <Help id="quality">
                <h4>
                  LABEL QUALITY <Explain id="quality" />
                </h4>
                <strong className="data-big">
                  {d.samples ? (d.labelQuality * 100).toFixed(1) : "—"}
                  <small>%</small>
                </strong>
                <p>
                  {d.samples
                    ? `${((1 - d.labelQuality) * 100).toFixed(1)}% estimated label errors`
                    : "Waiting for data"}
                </p>
              </Help>
            </div>
            <div className="data-stat">
              <Help id="duplicates">
                <h4>
                  DUPLICATES <Explain id="duplicates" />
                </h4>
                <strong className="data-big">
                  {d.samples ? (d.duplicates * 100).toFixed(1) : "—"}
                  <small>%</small>
                </strong>
                <p>
                  {d.samples
                    ? `${Math.round(d.duplicates * d.samples).toLocaleString()} repeated images`
                    : "Waiting for data"}
                </p>
              </Help>
            </div>
          </div>
          {!!d.samples && (
            <div className="coverage-row">
              <Help id="quality">
                <span>IMAGE QUALITY</span>
                <b>High {Math.round(d.labelQuality * 55)}%</b>
                <b>
                  Medium {Math.round((1 - (d.labelQuality * 55) / 100) * 70)}%
                </b>
                <b>
                  Low{" "}
                  {100 -
                    Math.round(d.labelQuality * 55) -
                    Math.round((1 - (d.labelQuality * 55) / 100) * 70)}
                  %
                </b>
                <Explain id="quality" />
              </Help>
              <Help id="environment">
                <span>ENVIRONMENT</span>
                <b>Indoor {Math.round(85 - d.diversity * 45)}%</b>
                <b>Outdoor {Math.round(15 + d.diversity * 45)}%</b>
                <Explain id="environment" />
              </Help>
            </div>
          )}
          <SectionHeading
            title="A cleaner learning signal"
            description="One-time improvements to the current collection. New purchases may require another pass."
          />
          <div className="cleaning-actions">
            {CLEANING.map((c) => (
              <Help
                key={c.id}
                id={`clean.${c.id}`}
                as="div"
                className="cleaning-row"
              >
                <span
                  className={`cleaning-icon ${d.cleaned.includes(c.id) ? "complete" : ""}`}
                >
                  {d.cleaned.includes(c.id) ? (
                    <CheckCheck size={17} />
                  ) : (
                    <Sparkles size={17} />
                  )}
                </span>
                <div>
                  <h3>
                    {c.name}
                    <Explain id={`clean.${c.id}`} />
                  </h3>
                  <p>{c.description}</p>
                </div>
                <Button
                  help={`clean.${c.id}`}
                  variant="secondary"
                  disabled={
                    !d.samples ||
                    locked ||
                    d.cleaned.includes(c.id) ||
                    s.budget < c.cost
                  }
                  onClick={() => s.clean(c.id)}
                >
                  {d.cleaned.includes(c.id) ? "Completed" : money(c.cost)}
                </Button>
              </Help>
            ))}
          </div>
        </>
      )}
      {tab === "preprocessing" && (
        <>
          <SectionHeading
            title="Separate learning from evaluation"
            description="Set aside examples before training. Your three splits must add up to 100%."
          />
          <div className="panel">
            <div className="split-visual">
              {(["train", "validation", "test"] as const).map((k) => (
                <div
                  key={k}
                  className={k}
                  style={{ flex: Math.max(1, d.split[k]) }}
                >
                  {d.split[k]}%
                </div>
              ))}
            </div>
            <div className="split-fields">
              {(["train", "validation", "test"] as const).map((k) => (
                <Field
                  key={k}
                  label={
                    k === "train"
                      ? "Train"
                      : k === "validation"
                        ? "Validation"
                        : "Local test"
                  }
                  help={`split.${k}`}
                  detail={`${Math.round((d.samples * d.split[k]) / 100).toLocaleString()} images`}
                >
                  <div className="range-value">
                    <input
                      type="range"
                      min="5"
                      max="90"
                      step="1"
                      value={d.split[k]}
                      disabled={locked}
                      onChange={(e) =>
                        s.updateDataset({
                          split: { ...d.split, [k]: +e.target.value },
                        })
                      }
                      aria-label={`${k} split`}
                    />
                    <strong>{d.split[k]}%</strong>
                  </div>
                </Field>
              ))}
            </div>
            <div
              className={`inline-notice ${splitTotal === 100 ? "positive" : "warning"}`}
            >
              {splitTotal === 100 ? (
                <Check size={15} />
              ) : (
                <SlidersHorizontal size={15} />
              )}
              Total: {splitTotal}%
              {splitTotal !== 100
                ? " — adjust the sliders to reach 100%."
                : " — each split has its own job."}
            </div>
          </div>
          <SectionHeading
            title="Prepare the pixels"
            description="Make an explicit choice about the inputs your CNN will receive."
          />
          <div className="panel field-grid">
            <Field label="Image resolution" help="resolution">
              <Select
                help="resolution"
                value={d.resolution}
                options={[64, 128, 224, 256]}
                disabled={locked}
                onChange={(v) => s.updateDataset({ resolution: +v })}
              />
            </Field>
            <Field label="Pixel normalization" help="normalization">
              <Select
                help="normalization"
                value={d.normalization}
                options={["None", "Scale to 0–1", "Standardize"]}
                disabled={locked}
                onChange={(v) => s.updateDataset({ normalization: v })}
              />
            </Field>
            <Field label="Sampling strategy" help="sampling">
              <Select
                help="sampling"
                value={d.sampling}
                options={["Random", "Class balanced"]}
                disabled={locked}
                onChange={(v) => s.updateDataset({ sampling: v })}
              />
            </Field>
          </div>
        </>
      )}
      {tab === "augmentation" && (
        <>
          <SectionHeading
            title="Same images. New perspectives."
            description="Choose transformations and their intensity. These run on training images only."
          />
          <div className="augmentation-grid">
            {AUGMENTATIONS.map((a) => {
              const value = d.augmentation[a.id];
              return (
                <Help
                  key={a.id}
                  id={`aug.${a.id}`}
                  as="div"
                  className={`augmentation-card ${value ? "enabled" : ""}`}
                >
                  <div className="augmentation-top">
                    <span className="aug-symbol">
                      <ImagePlus size={19} />
                    </span>
                    <Toggle
                      help={`aug.${a.id}`}
                      checked={value > 0}
                      label={a.name}
                      disabled={locked}
                      onChange={() =>
                        s.updateDataset({
                          augmentation: {
                            ...d.augmentation,
                            [a.id]: value ? 0 : a.id === "flip" ? 50 : 20,
                          },
                        })
                      }
                    />
                  </div>
                  <h3>
                    {a.name}
                    <Explain id={`aug.${a.id}`} />
                  </h3>
                  <p>
                    {a.id === "flip"
                      ? "Mirror the scene. Keep the species."
                      : a.id === "crop"
                        ? "Learn to see beyond perfect framing."
                        : a.id === "rotation"
                          ? "New angles on familiar faces."
                          : a.id === "brightness"
                            ? "Prepare for a different kind of light."
                            : a.id === "noise"
                              ? "Find the signal in imperfect images."
                              : a.id === "contrast"
                                ? "Look beyond image quality."
                                : "Vary the palette, preserve the pattern."}
                  </p>
                  <div className="range-value">
                    <input
                      type="range"
                      min="0"
                      max={a.max}
                      step={a.step}
                      value={value}
                      disabled={locked}
                      aria-label={`${a.name} intensity`}
                      onChange={(e) =>
                        s.updateDataset({
                          augmentation: {
                            ...d.augmentation,
                            [a.id]: +e.target.value,
                          },
                        })
                      }
                    />
                    <strong>
                      {a.id === "rotation" ? "±" : ""}
                      {value}
                      {a.unit}
                    </strong>
                  </div>
                  <div className="aug-impact">
                    <span>Diversity +{Math.round((value / a.max) * 100)}%</span>
                    <span>Compute +{Math.round((value / a.max) * 5)}%</span>
                  </div>
                </Help>
              );
            })}
          </div>
        </>
      )}
      <div className="stage-footer">
        <span>
          {validateDataset(d).length
            ? validateDataset(d)[0]
            : `${Math.round((d.samples * d.split.train) / 100).toLocaleString()} training images ready`}
        </span>
        <Button help="nav.model" onClick={() => s.setStage("model")}>
          Design your model
          <ArrowRight size={15} />
        </Button>
      </div>
      {examples && (
        <div className="modal-backdrop" onClick={() => setExamples(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Dataset examples"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <h2>A closer look</h2>
              <Button
                help="close"
                variant="quiet"
                onClick={() => setExamples(false)}
              >
                <X size={18} />
              </Button>
            </div>
            <p>
              Representative imagery for the simulated collection. These photos
              are illustrative, not the simulator’s training data.
            </p>
            <div className="example-images">
              <figure>
                <img src={CAT_IMAGE} alt="Cat in a natural scene" />
                <figcaption>CAT · Daylight · Clear label</figcaption>
              </figure>
              <figure>
                <img src={DOG_IMAGE} alt="Golden retriever portrait" />
                <figcaption>DOG · Outdoor · Clear label</figcaption>
              </figure>
            </div>
            <div className="inline-notice warning">
              Low-light coverage: {(d.night * 100).toFixed(0)}%. Estimated label
              errors: {((1 - d.labelQuality) * 100).toFixed(1)}%. A few examples
              cannot reveal every blind spot.
            </div>
          </section>
        </div>
      )}
    </>
  );
}
