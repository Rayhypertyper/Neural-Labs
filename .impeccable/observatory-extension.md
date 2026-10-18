# Training Observatory extension

Scoped implementation handoff · 2026-10-17

This is an ordinary extension of the incumbent light mint/green Nunito interface. The approved direction preserves the existing identity and puts learning concepts first, with optional layer and training-process detail. This handoff adds no palette, token system or durable identity decision. The implementation is code-led; no new design comp was approved for this extension.

## Implemented behavior

`src/components/TrainingObservatory.tsx` supplies a fixed bottom learning instrument across workspace stages. `NetworkDiagram.tsx` renders selectable representative network blocks and an **All layers** view. Hidden Dense layers are labeled in units; the final Dense output uses classes. `ObservatoryCurve.tsx` supplies accuracy/loss curves and epoch inspection. `src/game/observatory.ts` supplies projections, change descriptions, layer descriptions and phase explanations.

The instrument follows editable data/model/training settings, active training and saved experiments. Draft changes update free forecasts, resource estimates and causal text; comparisons use the previous edit or a pinned baseline. Live training takes priority over source selection. Saved curves remain tied to the saved run. Deployment adds inference estimates and compression explanations without replacing saved training evidence.

Play/pause, step, epoch seek, replay and speed controls share the game's playback state. Seeking an active run pauses it; **Follow latest epoch** returns to the newest available metrics. Layer selection, process phases and the eight most recent change events reveal additional explanations. Pinned baselines, change history and view controls are component state for the current page session; game progress and saved experiments use the existing browser-local store.

`src/components/observatory.css` reserves workspace space beneath the dock and moves help/toast layers above it. Compact desktop shows network, curves and explanation; compact tablet hides the curve pane; compact mobile focuses on the network, latest update and a visible simulator disclosure. **Explore** restores the curves, source selector and fuller explanations in an internally scrollable expanded view. At 700px and below, `.observatory:not(.expanded) .observatory-source` hides the source selector despite the later help-affordance rule.

Training curves and legend keys use dashes, validation uses a solid line, and baseline/previous-edit comparisons use dots. These patterns supplement color. Forward, backward and update cues are illustrative motion; reduced-motion rules disable animations and transitions. Metrics and forecasts are deterministic, approximate browser-local simulation, without real training, activations or gradients.

## Evidence checked

- Read `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, the Observatory components/styles/helper, the App mount and incumbent `src/styles.css`.
- Confirmed `DESIGN.md` already contains normative YAML tokens, including Nunito Sans typography and established surface/action roles. Confirmed `.impeccable/design.json` parses as schema version 2 with extension metadata and component snippets. Both files were preserved by this documentation handoff.
- Inspected `.impeccable/review/desktop.jpg`, `mobile.jpg` and `user-774.jpg`. They show the Observatory inheriting the incumbent rounded type, mint surfaces, quiet borders and compact controls. The desktop capture shows the expanded network/curve/explanation composition; the 774px capture shows the compact tablet arrangement.
- Re-inspected the updated `mobile.jpg` after the final source-selector correction: the compact header hides the selector and the footer keeps “Illustrative flow · simulated metrics” visible. The implementation owner also reports read-only browser checks with the source selector visible when expanded, hidden when compact, and no page overflow; those checks were not independently rerun during this documentation pass.

## Existing context drift

The following differences were already present in the inspected context files before this documentation pass. They are recorded for the owner rather than repaired during this scoped extension handoff:

- `DESIGN.md` describes a 253px compact mobile dock; final Observatory CSS uses 278px to accommodate the visible compact disclosure.
- `DESIGN.md` and the sidecar's signature excerpt describe/show a dashed baseline and solid training line. The final component and legend use dashed training, solid validation and dotted comparison lines.
- The frontmatter and sidecar snippets retain earlier muted/teal and filled-button values, while the tail of `src/styles.css` contains later contrast overrides for those roles and the mission action's text color. The extension continues the same mint/green family; this handoff does not promote those overrides into a new identity or rewrite the shared tokens.

Documentation verification: README controls and simulator claims were checked against source. No source, tests, screenshots, `PRODUCT.md`, `DESIGN.md` or design sidecar were changed by this handoff. Functional verification and the final finish score remain the implementation owner's review evidence.
