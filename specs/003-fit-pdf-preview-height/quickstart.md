# Quickstart: Fit PDF Preview To Viewport Height

Validates the feature end-to-end against a running instance of the app. All
scenarios start from the app's defaults and list only what changes — see
[spec.md](./spec.md) for the acceptance scenarios these map to, and
[contracts/preview-fit.md](./contracts/preview-fit.md) for the exact scale math
being verified.

## Prerequisites

```bash
pnpm install
```

Automated driving uses this project's `run-project` skill
(`.claude/skills/run-project/driver.mjs`) — see that skill for first-run Chromium
setup. All commands below assume the REPL is already running with
`server-start` and `launch` done. Scenarios assume a browser window of at least
1280×800 (SC-005).

## Scenario 1 — Default load shows the whole page, no window scroll (US1, SC-001)

```text
goto /
wait-settled
eval document.documentElement.scrollHeight <= window.innerHeight
```

Expect: `true`. (`fit-page` is the default mode — FR-006.)

## Scenario 2 — No fit mode ever distorts the page's aspect ratio (US1, SC-002)

For each of `page`, `height`, `width`:

```text
select select[name="fitMode"] <mode>
wait-settled
eval (() => { const c = document.querySelector('#preview canvas'); const r = c.getBoundingClientRect(); return Math.abs(r.width / r.height - <pdfPageWidth> / <pdfPageHeight>) < 0.01; })()
```

Expect: `true` for all three modes. (`<pdfPageWidth>`/`<pdfPageHeight>` = US Letter
in points, 612 × 792, for the default options — same for every mode since this
feature never changes the exported PDF's own page size.)

## Scenario 3 — fit-height fills the available height exactly

```text
select select[name="fitMode"] height
wait-settled
eval (() => { const c = document.querySelector('#preview canvas'); const container = document.querySelector('#preview'); return Math.abs(c.getBoundingClientRect().height - container.getBoundingClientRect().height) < 1; })()
```

Expect: `true`.

## Scenario 4 — fit-width fills the available width exactly

```text
select select[name="fitMode"] width
wait-settled
eval (() => { const c = document.querySelector('#preview canvas'); const container = document.querySelector('#preview'); return Math.abs(c.getBoundingClientRect().width - container.getBoundingClientRect().width) < 1; })()
```

Expect: `true`.

## Scenario 5 — Re-fits on option change, mode is not reset (US1 AC2, US2 AC3)

```text
select select[name="fitMode"] height
fill input[name="habits"] 8
wait-settled
eval document.querySelector('select[name="fitMode"]').value === 'height'
eval document.documentElement.scrollHeight <= window.innerHeight
```

Expect: both `true`.

## Scenario 6 — Narrow-viewport breakpoint still fits (FR-011)

Playwright-level viewport resize isn't available via the driver's `eval` — this is
covered by `tests/e2e/preview-fit.spec.ts`'s narrow-viewport test (T015). Run:

```bash
pnpm e2e -g "preview-fit"
```

and confirm it passes, including the narrow-viewport case.

## Scenario 7 — Full automated check

```bash
pnpm test   # unit: computePreviewScale math (tests/unit/preview-fit.test.ts)
pnpm e2e    # e2e: window-scroll + aspect-ratio assertions across all three modes
pnpm margins  # unaffected by this feature, but confirms the exported PDF itself is untouched
```

Expect: all three green.
