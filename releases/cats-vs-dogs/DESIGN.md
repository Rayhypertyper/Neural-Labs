---
name: Neural Labs
description: A playful research workbench where experiments become discoveries.
colors:
  ink: "#273746"
  muted: "#657581"
  cool-ground: "#f7f9fb"
  surface: "#fff"
  border: "#e5eaed"
  teal: "#187c6b"
  teal-deep: "#156c5e"
  teal-pale: "#e5f5ef"
  action: "#247c67"
  action-hover: "#227460"
  mission: "#ed946d"
  mission-hover: "#e38c64"
  mission-surface: "#e1f3e9"
  mission-ink: "#285b43"
  mission-copy: "#4f6e5c"
  mission-action-ink: "#4b2c20"
  mission-action-ink-hover: "#3f2318"
  inspector-copy: "#5c7163"
  periwinkle: "#7c85c2"
  budget: "#d47c47"
  lilac-surface: "#f3f0fc"
  gold-surface: "#fff1d6"
  gold-ink: "#876634"
  observatory-surface: "#fcfefd"
  observatory-header: "#f0f6f2"
  observatory-training: "#8b79b2"
  observatory-validation: "#218777"
  observatory-baseline: "#85948b"
  signal-forward: "#2f8d70"
  signal-backward: "#9674aa"
typography:
  display:
    fontFamily: '"Nunito Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "37px"
    fontWeight: 900
    lineHeight: 1.17
    letterSpacing: "-1.3px"
  headline:
    fontFamily: '"Nunito Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "29px"
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: "-1.1px"
  title:
    fontFamily: '"Nunito Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "17px"
    fontWeight: 800
    letterSpacing: "-0.45px"
  body:
    fontFamily: '"Nunito Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.75
  label:
    fontFamily: '"Nunito Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "11px"
    fontWeight: 700
rounded:
  badge: "4px"
  field: "6px"
  button: "7px"
  nav: "8px"
  panel: "12px"
  pipeline: "13px"
  mission: "14px"
  modal: "17px"
spacing:
  compact: "4px"
  small: "8px"
  control: "11px"
  medium: "16px"
  group: "20px"
  panel: "24px"
  section: "30px"
  workspace: "34px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-mission:
    backgroundColor: "{colors.mission}"
    textColor: "{colors.mission-action-ink}"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  button-mission-hover:
    backgroundColor: "{colors.mission-hover}"
    textColor: "{colors.mission-action-ink-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "#5a6e7a"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "#58716b"
    padding: "6px 0"
  button-danger:
    backgroundColor: "#b24f45"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  input-number:
    backgroundColor: "#fcfdfd"
    textColor: "#526c7b"
    rounded: "{rounded.field}"
    padding: "10px 11px"
    height: "37px"
  nav-active:
    backgroundColor: "#e9f5f0"
    textColor: "#237867"
    rounded: "{rounded.nav}"
    padding: "11px 12px"
  status-ready:
    backgroundColor: "#eaf5ec"
    textColor: "#507556"
    rounded: "{rounded.badge}"
    padding: "4px 7px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "24px"
  pipeline-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pipeline}"
    padding: "17px 14px 15px"
    height: "168px"
  observatory:
    backgroundColor: "{colors.observatory-surface}"
    textColor: "#283f36"
    height: "350px"
---

# Design System: Neural Labs

## Overview

**Creative North Star: "Lab workbench"**

A friendly research game built from cool white surfaces, mint experiments and tactile, rounded controls. The user chose a more playful, game-like world: the heavy rounded type, coral mission action, gently tilted specimen cards and small gold rewards make research feel approachable.

The interface stays compact enough to compare evidence. Precise borders and tabular numbers support the science; pastel stage icons, lilac prompts and small celebratory accents provide the play. The persistent Training Observatory extends these primitives into a shared learning instrument, with concepts first and optional detail.

**Key Characteristics:**

- Rounded Nunito Sans with confident, heavy headings.
- Cool surfaces, mint and teal actions, coral mission entry.
- Quiet bordered panels with selective tactile lift.
- Small educational annotations beside consequential controls.

## Colors

The palette combines cool paper and blue-gray text with a botanical mint core and small warm or lilac accents. Frontmatter values are the normative extracted palette.

### Primary

- **Research Teal** (`teal`, `teal-deep`, `teal-pale`): interaction accents, educational selection and soft supporting surfaces.
- **Action Teal** (`action`, `action-hover`): the default filled action and its hover state.
- **Mission Mint** (`mission-surface`, `mission-ink`, `mission-copy`): the contract panel, strong headline and deeper green body copy.

### Secondary

- **Mission Coral** (`mission`, `mission-hover`): the overview's Begin research action, with dark warm text (`mission-action-ink`, `mission-action-ink-hover`) for contrast.
- **Periwinkle** (`periwinkle`): training-series identity and technical accents.
- **Notebook Lilac** (`lilac-surface`): the reflective research prompt.
- **Observatory Training Lilac** (`observatory-training`): the Observatory's training curve; its validation curve retains the distinct local **Observatory Validation Teal** (`observatory-validation`). **Illustrative Signals** (`signal-forward`, `signal-backward`) distinguish forward flow from the purple backward phase.

### Tertiary

- **Budget Orange** (`budget`): budget and cost accents.
- **Reward Gold** (`gold-surface`, `gold-ink`): the first-mission badge and small reward cues.

### Neutral

- **Cool Ground** (`cool-ground`): the application workspace.
- **White Surface** (`surface`): navigation, panels and controls.
- **Blue-gray Ink** (`ink`, `muted`): primary text and supporting copy.
- **Field-guide Green** (`inspector-copy`): deeper inspector paragraphs and tradeoff lists.
- **Quiet Border** (`border`): panel edges, rows and structural dividers.
- **Observatory Paper** (`observatory-surface`, `observatory-header`): the instrument body and softly tinted header. **Baseline Gray** (`observatory-baseline`) uses a dashed curve and a text legend for prior configurations.

**The Mission Accent Rule.** Preserve coral for the contract's invitation to begin research; ordinary workflow actions use teal.

## Typography

**Display and body font:** Nunito Sans Variable, with the system sans-serif fallbacks declared above. The application imports the variable font locally through Fontsource.

The rounded letterforms carry the playful voice. Headings are tightly tracked and heavy; labels and annotations remain compact. There is no separate monospace face.

- **Display:** the mission headline; its base token grows to (44px) on very wide screens and is adjusted by the existing responsive rules.
- **Headline:** stage headings. Their base token is heavy and compact; mobile uses (27px).
- **Title:** major section and inspector headings. Smaller panel headings use (13–15px).
- **Body:** the root role; most working copy is deliberately smaller (10–11px), with open paragraph leading (1.75–1.9).
- **Label:** field labels; navigation uses (11px), active weight (800). Small uppercase section labels add tracking around (1px).
- **Metrics:** strong numerals generally use (23–29px); budget and overview statistics use tabular numerals.

**The Friendly Precision Rule.** Keep the rounded sans-serif and use weight, spacing and tabular numerals to distinguish scientific information.

## Layout

The established desktop shell uses a fixed navigation rail (216px), sticky top bar (74px), central workspace and pinned field-guide inspector (267px). The workspace has a maximum width (1500px) and base padding (33px 34px 0). These are current shell measurements, not requirements for every future surface.

At (1350px) and below, the rail and inspector tighten to (190px) and (240px). At (1199px) and below, the inspector becomes a sliding help drawer and the central workspace receives the freed width. At (900px) and below, the rail narrows to (176px). At (640px) and below, navigation becomes a (224px) drawer, the main left margin disappears, the top bar is (63px), and workspace padding becomes (25px 20px 0). The mobile menu remains an explicit button. At (1600px) and above, the rail and inspector widen to (237px) and (290px).

Use compact control groups, medium panel interiors and larger breaks between sections. The overview uses three adjacent metric cells and four pipeline cards. Form grids and result comparisons reduce their columns on smaller screens; cards and tables retain their information hierarchy rather than shrinking every element uniformly. Preserve horizontal scrolling where a comparison table needs it.

The Observatory is fixed to the bottom, aligned to the rail's right edge and extending across the remaining width. Its compact height is (350px), dropping to (295px) at (1100px) and (253px) at (700px). Expanded height is `min(560px, 76dvh)` with an internally scrollable body. Main content reserves bottom space; help and toast layers move above the instrument. On mobile, an open help drawer may cover it.

Desktop compact mode shows network, curves and explanation in three columns. At (1100px) the compact chart is hidden; expanded mode restores it and places explanation across both columns. At (700px) compact mode concentrates on the network and a short update with “Explore why”; expanded mode stacks the chart and explanations and restores source selection. At (640px) the dock spans the full width. Layer and phase explanations appear in expanded mode.

## Elevation & Depth

Borders and lightly tinted backgrounds do most of the structural work. Shadows are restrained on ordinary actions and stronger only for specimen imagery, hover lift and transient layers.

- **Action:** `0 3px 6px #297d6b0b` under the teal primary button.
- **Specimen:** `0 10px 24px #37624916` under the tilted animal cards.
- **Pipeline hover:** `0 8px 20px #28534807`, paired with upward movement (3px).
- **Tooltip:** `0 10px 34px #253e3424`.
- **Modal:** `0 20px 80px #1b352c25`, above a dimmed, softly blurred backdrop.
- **Observatory dock:** `0 -8px 24px #233d3210`, a quiet upward edge beneath the persistent instrument.

Default button transitions run (0.18s); the press moves down (1px). Drawers use (0.25s). Progress and training effects communicate state. Honor the existing reduced-motion media query, which removes animations and transitions.

## Shapes

Use gentle corners with a clear scale: small badges, slightly larger fields and buttons, then panels, pipeline cards and the mission surface. Borders are normally a single quiet stroke (1px). Pill-like shapes belong to switches and circular markers rather than every control.

Small illustrated objects can tilt: the brand mark, note symbol and specimen cards make the workbench tactile. Data panels and readable content remain aligned to the grid. Lucide-style thin stroke icons support labels; they do not replace clear action text.

## Components

### Buttons

Compact, friendly and tactile. Filled, secondary and danger buttons share the frontmatter's button shape and padding, type size (10px), weight (750), line height (1.4), gap (9px) and minimum height (36px). The primary uses deeper teal with white text; the mission invitation uses coral with dark warm text. Secondary actions use white with a quiet border. Quiet actions remove the box and use teal-gray text. Danger is muted red for reset confirmation.

All buttons inherit a visible teal keyboard outline (2px, offset 4px), a small press movement and a disabled opacity (0.46). Secondary hover adds a pale mint tint and a greener border.

### Chips

Status chips are compact rounded rectangles, with a small dot for pending state and a check for ready state. Pending uses a warm neutral fill; ready uses pale green. The first-mission badge is gold, with a small sparkle icon and slightly heavier type. Keep readable text alongside each state cue.

### Cards / Containers

Panels are white, bordered and softly rounded. Their base interior padding is (24px), reduced to (21px) on mobile. Metric groups share one outer border and divide internally. Pipeline cards pair a pastel icon tile, short title, description and next-step status; they lift gently on hover. Selected checkpoints shift to a pale green fill and greener border.

### Inputs / Fields

Number inputs and selects use the same cool off-white surface, quiet border and rounded field shape. Labels sit above the control, with a small adjacent information button and optional detail below. The focus border turns sage and gains a pale mint outline. Mobile controls grow to (41px) high and (12px) type. Range inputs and switches use green state accents.

### Navigation

The left rail uses icon-and-text rows. Active navigation combines a pale mint row, heavier teal text and a short green marker at the rail edge. Hover adds a lighter tint. Mobile navigation opens as a drawer with a dimmed scrim; the top-bar menu button stays available.

### Educational Inspector

A calm field guide with a small tinted symbol, heavy subject heading, open explanatory leading, thin dividers, tradeoff lists and small effect tags. Below desktop width it becomes an on-demand drawer. Keep help beside the relevant decision and preserve the shared education interaction. Lead with learning concepts and reveal technical details optionally, as the user requested for the visualizer.

### Training Observatory

“Learning, in view” is a persistent instrument with a tinted header, compact state label, source selection and Explore/Compact control. Representative network units share the soft green selection grammar. Training and validation curves have text legends; a dashed gray baseline preserves comparison meaning. Epoch controls, metrics and short causal explanations sit beside the network. “All layers,” layer selection, training phases and recent changes reveal more detail without overwhelming the initial view.

Signal dashes move for active training or replay (1.3s, linear); the backward phase reverses their direction and turns purple. The update phase pulses node stroke width (1.5s), and the active status dot pulses opacity. These are conceptual cues: retain the visible statement that signal flow is illustrative and epoch metrics are simulated, with no measured neuron activations or gradients. Stop decorative motion for reduced-motion preferences. The sidecar's small signature excerpt demonstrates this grammar rather than reproducing every control and state.

## Do's and Don'ts

### Do:

- **Do** use Nunito Sans Variable and heavy, tightly tracked headings.
- **Do** use cool white panels, quiet borders and mint selection states.
- **Do** retain coral mission entry, lilac reflection and small gold reward cues.
- **Do** pair scientific metrics with clear labels and tabular numerals.
- **Do** keep educational context close to consequential controls.
- **Do** honor keyboard focus, disabled states and reduced motion.

### Don't:

- **Don't** replace the playful workbench with a corporate dashboard or spreadsheet aesthetic.
- **Don't** add a second display face or an unrelated accent palette.
- **Don't** apply decorative tilt to reading surfaces or data grids.
- **Don't** use strong floating shadows on every panel.
- **Don't** rely on color alone to communicate readiness, selection or progress.
