// The single layout definition for the printable habit grid (constitution Principle I).
// Inputs arrive through sys.inputs, so every value is a string.
// Constants and fit rules: specs/001-printable-habit-grid/data-model.md.

#let inp(key, default) = sys.inputs.at(key, default: default)
#let num-in(key, default) = float(inp(key, str(default)))
#let int-in(key, default) = int(float(inp(key, str(default))))

#let layout-kind = inp("layout", "rows")
#let habits = int-in("habits", 5)
#let days = int-in("days", 31)
#let per-row = int-in("perRow", 7)
#let dot-d = num-in("dotDiameterMm", 4) * 1mm
#let dot-gap = num-in("dotSpacingMm", 1.5) * 1mm

// Planning-default constants (data-model.md, Fit rules).
#let margin = 10mm
#let row-label-w = 40mm
#let label-h = 6mm
#let label-col-h = 30mm
#let gap = 4mm
#let num-h = 3mm // day-number band above each dot line (layouts rows and calendars)
#let num-w = 6mm // day-number column at the left of each row (layout columns)

#let pitch = dot-d + dot-gap
#let line-h = pitch + num-h
// US Letter only (constitution Technical Constraints).
#let page-w = 215.9mm
#let page-h = 279.4mm
#let usable-w = page-w - 2 * margin

#set page(paper: "us-letter", margin: margin)
#set text(size: 8pt)

#let dot = circle(radius: dot-d / 2, stroke: 0.5pt + black)
#let writing-line(w) = line(length: w, stroke: 0.4pt + gray)

// One dot cell. A day that is a multiple of 5 gets its number above the dot.
#let dot-cell(day) = box(width: pitch, height: line-h)[
  #if calc.rem(day, 5) == 0 {
    place(top + center, text(size: 5pt)[#day])
  }
  #place(bottom + center, dot)
]

// Dots for days first through last, in order on one line.
#let dot-line(first, last) = stack(
  dir: ltr,
  spacing: 0pt,
  ..range(first, last + 1).map(d => dot-cell(d)),
)

// Layout rows: one habit per block, dots wrap at per-row, label area on the left.
#let row-habit = {
  let nlines = calc.ceil(days / per-row)
  let lines = range(nlines).map(i => dot-line(
    i * per-row + 1,
    calc.min((i + 1) * per-row, days),
  ))
  grid(
    columns: (row-label-w, auto),
    box(width: row-label-w - 4mm, height: nlines * line-h)[
      #place(bottom, writing-line(row-label-w - 4mm))
    ],
    stack(dir: ttb, spacing: 0pt, ..lines),
  )
}

// Layout columns: habits are columns, days are rows, per-row habits per group.
#let column-group(n) = {
  let header = stack(
    dir: ltr,
    spacing: 0pt,
    box(width: num-w, height: label-col-h),
    ..range(n).map(_ => box(width: pitch, height: label-col-h)[
      #place(bottom + center, rotate(-90deg, reflow: true, writing-line(label-col-h - 2mm)))
    ]),
  )
  let rows = range(1, days + 1).map(d => stack(
    dir: ltr,
    spacing: 0pt,
    box(width: num-w, height: pitch)[
      #if calc.rem(d, 5) == 0 {
        place(horizon + right, text(size: 5pt)[#d])
      }
    ],
    ..range(n).map(_ => box(width: pitch, height: pitch)[
      #place(horizon + center, dot)
    ]),
  ))
  stack(dir: ttb, spacing: 0pt, header, ..rows)
}

// Layout calendars: one mini calendar per habit, per-row dots per calendar row.
#let calendar-block = {
  let nlines = calc.ceil(days / per-row)
  let lines = range(nlines).map(i => dot-line(
    i * per-row + 1,
    calc.min((i + 1) * per-row, days),
  ))
  stack(
    dir: ttb,
    spacing: 0pt,
    box(width: per-row * pitch, height: label-h)[
      #place(bottom, writing-line(per-row * pitch))
    ],
    ..lines,
  )
}

// Fit checks on width (height overflow is caught by Typst's own pagination).
#let fits-w = if layout-kind == "columns" {
  num-w + calc.min(habits, per-row) * pitch <= usable-w
} else if layout-kind == "calendars" {
  per-row * pitch <= usable-w
} else {
  row-label-w + per-row * pitch <= usable-w
}

#if not fits-w {
  // Width overflow (FR-013): a second page makes the engine report overflow,
  // so download is blocked. Nothing is shrunk or dropped.
  [Overflow: the grid is too wide for one page.]
  pagebreak()
  [Overflow: the grid is too wide for one page.]
} else if layout-kind == "columns" {
  let groups = range(calc.ceil(habits / per-row)).map(g => column-group(
    calc.min(per-row, habits - g * per-row),
  ))
  stack(dir: ttb, spacing: gap, ..groups)
} else if layout-kind == "calendars" {
  let per-page-row = calc.max(1, calc.floor((usable-w + gap) / (per-row * pitch + gap)))
  let rows = range(calc.ceil(habits / per-page-row)).map(r => stack(
    dir: ltr,
    spacing: gap,
    ..range(r * per-page-row, calc.min((r + 1) * per-page-row, habits)).map(_ => calendar-block),
  ))
  stack(dir: ttb, spacing: gap, ..rows)
} else {
  stack(dir: ttb, spacing: gap, ..range(habits).map(_ => row-habit))
}
