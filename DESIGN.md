---
name: Neural Labs
description: A playful, colorful learning lab where decisions become evidence.
colors:
  ink: "#29283e"
  muted: "#6e6b80"
  ground: "#f7f7fb"
  surface: "#fff"
  border: "#e5e3ee"
  violet: "#6854c7"
  violet-deep: "#5140a8"
  violet-pale: "#efecfc"
  action: "#6a54c7"
  action-hover: "#5741b2"
  focus: "#6952c7"
  hero-lilac: "#eeebfa"
  stage-lilac: "#eee8fa"
  stage-lilac-ink: "#655185"
  stage-peach: "#f9e9dc"
  stage-peach-ink: "#805135"
  stage-blue: "#e8effa"
  stage-blue-ink: "#516d8a"
  stage-pistachio: "#edf0dc"
  stage-pistachio-ink: "#5e6839"
  notebook-lilac: "#f2e9f5"
  nav-selected: "#eee9fb"
  nav-ink: "#5a43ad"
  field: "#fdfcfe"
  field-ink: "#554963"
  validation: "#39866d"
typography:
  display:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "48px"
    fontWeight: 650
    lineHeight: 1.11
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "31px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  title:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "21px"
    fontWeight: 650
    letterSpacing: "-0.035em"
  body:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "14px"
    fontWeight: 450
    lineHeight: 1.75
  label:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "12px"
    fontWeight: 550
rounded:
  field: "7px"
  button: "8px"
  compact: "10px"
  panel: "12px"
  hero: "16px"
spacing:
  small: "8px"
  control: "10px"
  medium: "18px"
  group: "24px"
  panel: "26px"
  workspace-inline: "38px"
  section: "75px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "11px 17px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "#625677"
    rounded: "{rounded.button}"
    padding: "11px 17px"
    height: "42px"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.field}"
    height: "38px"
  nav-selected:
    backgroundColor: "{colors.nav-selected}"
    textColor: "{colors.nav-ink}"
    rounded: "{rounded.button}"
    padding: "12px 13px"
  contract-chip:
    backgroundColor: "#f5eefb"
    textColor: "#725289"
    rounded: "4px"
    padding: "4px 7px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "26px"
  learning-stage:
    backgroundColor: "{colors.stage-lilac}"
    textColor: "{colors.stage-lilac-ink}"
    rounded: "{rounded.panel}"
    padding: "22px 20px 19px"
  observatory-minimized:
    backgroundColor: "#fcfaff"
    textColor: "#584265"
    height: "55px"
---

# Design System: Neural Labs

## Overview

**Creative North Star: "The curiosity lab"**

A cheerful research game with the clarity of a science exhibition catalogue. Soft lilac ground, white work surfaces, precise separators and colorful learning stages make consequential experiments approachable. Geist supplies a clear technical voice without making the workspace feel corporate.

Specimen photography and the player's own evidence lead the experience. Generous introductions give way to practical controls, a notebook and an on-demand field guide. Keep the language clear, encouraging and specific about the next decision; scientific metrics stay precise and visibly simulated.

**Key Characteristics:**

- Locally bundled Geist, clean hierarchy and tabular metrics.
- Violet actions with lilac, peach, blue and pistachio learning stages.
- Flat white work surfaces with selective lift for specimens and temporary layers.
- Educational context beside consequential controls.

## Colors

The palette combines a quiet lilac foundation with distinct, soft learning-stage colors. Frontmatter tokens are normative; the source token names `--teal` and `--teal-deep` now resolve to violet.

### Primary

- **Research Violet** (`violet`, `violet-deep`, `violet-pale`): shared interactive accents and supporting selection surfaces.
- **Action Violet** (`action`, `action-hover`): filled actions and their hover state. **Focus Violet** (`focus`) gives keyboard interactions a consistent visible outline.
- **Selected Lilac** (`nav-selected`, `nav-ink`): active navigation uses both a tinted row and stronger text.

### Secondary

- **Specimen Lilac** (`hero-lilac`): the spacious contract introduction.
- **Preparation Lilac**, **Model Peach**, **Training Blue**, **Evaluation Pistachio** (`stage-*`): four sequential learning stages, each with its own paired ink token. Retain the reviewed peach and pistachio ink pairings.
- **Notebook Lilac** (`notebook-lilac`): reflection and research questions.

### Tertiary

- **Validation Green** (`validation`): validation curves and their labeled legends.

### Neutral

- **Deep Ink** and **Quiet Ink** (`ink`, `muted`): primary and supporting text.
- **Cool Lilac Ground**, **White Surface**, **Quiet Border** (`ground`, `surface`, `border`): workspace, working panels and thin separators.
- **Field Paper** and **Field Ink** (`field`, `field-ink`): editable controls.

**The Paired Ink Rule.** Keep each pastel stage with its corresponding dark ink. Color supports the stage name, sequence number and written state.

## Typography

**Display and body font:** Geist Variable, bundled locally through Fontsource, with a sans-serif fallback. Weight and scale provide hierarchy within one family.

- **Display:** the centered overview introduction, tightly tracked and deliberately two-line. It grows to (57px) on wide screens; the smallest layout uses (37px) with natural wrapping.
- **Headline:** stage and notebook headings; notebook headings use (600) weight and (1.24) leading.
- **Title:** section headings. Learning-stage titles use (19–20px), (600) weight and (1.25) leading.
- **Body:** the root role; workspaces use (12–13px) supporting copy. Notebook and hero paragraphs use open (1.9) leading. The notebook introduction is limited to (35ch), widening on smaller layouts.
- **Label:** compact controls and navigation. Minor annotations use (10–11px); small text must retain readable contrast.
- **Metrics:** large numerals use (24–28px) and tabular figures. Retain adjacent labels and units.

## Layout

The desktop shell has a fixed rail (224px), top bar (68px), and centered workspace with a maximum width (1400px). Base workspace padding is (33px 38px 0). The rail becomes (205px) at widths up to (1250px), and (240px) from (1600px). At (760px) and below it becomes a (235px) drawer, the content fills the viewport and the top bar becomes (62px). The interface supports a minimum viewport width of (320px).

The overview pairs a centered introduction with rectangular specimen frames, followed by a three-cell metric strip. At (540px) the introduction precedes the specimens and metrics become stacked rows. A four-stage accordion changes to a two-column grid at (1000px); keep written descriptions visible there. The contract board uses two columns, becoming one at (760px).

The notebook uses a two-column introduction/evidence layout with a (70px) gap and generous (110px 0 90px) section padding. At (1000px) it becomes one column. From (1100px), with motion permitted, GSAP pins the introduction and scrubs evidence into view; evidence sheets stack at sticky offsets (120px) and (145px).

The field guide is an on-demand right drawer (310px), rather than a permanent third column. The Observatory is fixed below the workspace, aligned to the rail and spanning the remaining width. Its minimized state is (55px), regular state is (290px) before inherited smaller-screen instrument rules, and expanded state is `min(560px, 76dvh)`. Reserve content space for the active state. Expanded mobile controls wrap into an explicit grid so they remain reachable.

## Elevation & Depth

Tonal surfaces and thin borders create the default hierarchy. Ordinary buttons have no shadow. Specimens, tooltips and open drawers receive selective depth; the Observatory gets a quiet upward edge.

- **Specimen:** `0 10px 25px #6e558915`.
- **Field guide:** `-12px 0 45px #38285413` while open.
- **Tooltip:** `0 8px 28px #35204f17`.
- **Observatory:** `0 -4px 22px #58416b08`.

**The Quiet Surface Rule.** Keep working panels flat; use lift to distinguish specimens, temporary context and an explicit interaction.

## Shapes

Use gentle rectangular corners: fields are slightly tighter than buttons, panels are broader and the hero is the largest surface. A single thin border separates most work surfaces. The brand mark and specimen frames can tilt; reading panels, grids and evidence remain aligned. Thin stroke icons support written labels.

## Components

### Buttons

Clear and comfortable. Primary actions use Action Violet with white text; secondary actions use white with a quiet violet border. The shared minimum height is (42px); the mobile hero actions grow to (44px). Quiet actions remove the box. Danger actions use muted red only for destructive controls. Hover changes fill or text, pressing moves down (1px), and disabled opacity is (0.48). Keyboard focus uses a visible (2px) violet outline with (4px) offset.

### Inputs / Fields

Cool field paper, dark field ink, a quiet border and gently rounded corners. Shared minimum height is (38px); labels sit above with an adjacent information control and supporting text. Focus changes the border to violet and retains the global keyboard outline. Range controls use violet. Keep labels, units and explanations attached to the decision.

### Navigation

Icon-and-text rows use comfortable (45px) minimum height. The active row has selected lilac, darker violet text and stronger weight. Hover adds a lighter lilac tint. Mobile navigation has a scrim, a close control and Escape handling with focus returned to the menu trigger.

### Chips

Contract category chips are compact rounded rectangles with lilac tint and readable violet text. Keep status text beside any state icon or dot; color alone does not communicate state.

### Cards / Containers

White panels use quiet borders and the shared panel corner. Metric cells share an outer container with internal dividers. Learning stages use the four paired palettes, sequence numbers, explicit next-step status and gentle hover lift (3px); their active state widens on desktop. Notebook evidence combines a white entry sheet with a lilac research question, rather than nesting unnecessary panels.

### Field Guide

A calm, on-demand explanatory drawer with a tinted heading, clear subject title, tradeoff lists and effect tags. Opening moves focus inside; Tab stays within the open dialog, Escape dismisses it, and closing restores focus to the previous control. Keep the guide adjacent to the player's actual decision.

### Training Observatory

A persistent learning instrument whose minimized header preserves status and the route back to detail. Expanded views expose representative network units, labeled curves, epoch controls and causal explanations. Curves retain text legends and a dashed prior-configuration baseline. Keep the visible qualification that signal flow is illustrative and metrics are simulated.

Motion communicates state: standard controls transition in (180ms), the field guide in (220ms), the accordion in (500ms), and specimens in (650–700ms). The research marquee travels in (36s), pauses on hover/focus and has an explicit pause control. Reduced-motion preferences remove decorative animation and transitions and disable the GSAP pinned sequence.

## Do's and Don'ts

### Do:

- **Do** use locally bundled Geist with clear weight and size hierarchy.
- **Do** retain paired pastel stages and their dark, reviewed text colors.
- **Do** give specimens, decisions and recorded evidence clear visual priority.
- **Do** keep labels, units, learning context and simulated-state explanations visible.
- **Do** preserve keyboard focus, drawer dismissal and reduced-motion behavior.

### Don't:

- **Don't** turn the learning lab into a corporate dashboard, course or spreadsheet interface.
- **Don't** restore the previous Nunito and mint visual system in new screens.
- **Don't** tilt reading surfaces or data grids.
- **Don't** add strong floating shadows to every panel.
- **Don't** rely on color alone for progress, readiness or selection.
