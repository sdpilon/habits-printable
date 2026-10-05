# Printable Habit Grid Constitution

## Core Principles

### I. Single Layout Source

The tracker layout MUST be defined once, in Typst, and that single definition MUST drive both the
on-screen preview and the exported PDF. The web page MUST NOT contain a separate drawing
implementation of the grid. Rationale: two independent renderers inevitably drift apart, which
breaks the guarantee that what is previewed is what is printed.

### II. Preview Equals Print

For identical option values, the exported PDF and the on-screen preview MUST be the same file. The
preview MUST be drawn from the exported PDF, so the two are identical by construction and no separate
comparison of renderings is required. Any change that affects layout, dot geometry, spacing, or label
areas MUST pass the printable-margin check (`tests/comparison/margins.ts`) before it is accepted.
Rationale: two separate renderings of one layout can drift apart through antialiasing and rounding;
one file cannot. A failing margin check is a defect, not a tolerance to accept.

### III. Hand-Fillable Output

Every dot MUST be an empty circle large enough to be filled in by pen or pencil at the default size,
and the default layout MUST keep all content inside printable margins on A4 and US Letter paper.
Output MUST NOT depend on color, interactivity, or any on-page element that is not printed. Rationale:
the product's only purpose is a physical sheet that a person marks by hand.

### IV. Responsive Options

Option changes MUST update the preview immediately, and the preview MUST NEVER show a layout that
does not correspond to the currently valid options. Invalid or intermediate input (empty, zero,
negative, non-numeric, over maximum) MUST produce a clear message and MUST NOT produce a download.
Rationale: a stale or misleading preview wastes paper and erodes trust in the export.

### V. Scope Discipline

The product MUST remain a generator of printable paper grids. Accounts, saved trackers, cloud
storage, habit-name capture, and tracking or analytics features are out of scope unless a ratified
amendment adds them. Simplicity is preferred over configurability that no spec requires (YAGNI).

## Technical Constraints

- Layout and rendering MUST use Typst. This is a user-mandated constraint and MUST NOT be replaced
  without a MAJOR amendment.
- The default paper size MUST be A4; US Letter MUST be available.
- Exports MUST be generated at 100% scale with no scaling applied by the tool, so that printed
  dimensions match the preview.
- Maximum habit count, day count, and dots per row MUST be defined as explicit limits in the
  specification before release, so that layouts stay printable and the preview stays responsive.

## Development Workflow

- Every feature MUST begin with a specification under `specs/` created through the Spec Kit
  workflow, and MUST pass its quality checklist before planning begins.
- Every change that touches layout or rendering MUST run the printable-margin check (Principle III)
  as part of its verification, and the result MUST be recorded in the review. Principle II holds by
  construction: the preview and the download use the same compiled PDF.
- Reviews MUST confirm compliance with Principles I through V before merge. A change that violates a
  principle MUST either be corrected or accompanied by a constitution amendment.

## Governance

This constitution supersedes all other project practices where they conflict. Amendments MUST be
recorded in this file with an updated Sync Impact Report, a version bump under the policy below, and
an updated Last Amended date.

Versioning policy (semantic versioning):
- MAJOR: removing or redefining a principle or constraint in a backward-incompatible way, including
  replacing Typst or relaxing Principle II.
- MINOR: adding a principle, section, or materially expanded guidance.
- PATCH: clarifications, wording, or typo fixes that do not change what is required.

Compliance review: every spec, plan, and review MUST check the Core Principles and Technical
Constraints. Complexity beyond what a spec requires MUST be justified against Principle V.

**Version**: 1.1.0 | **Ratified**: 2026-10-05 | **Last Amended**: 2026-10-05
