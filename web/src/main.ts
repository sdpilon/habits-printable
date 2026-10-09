// Wires the options form to validation, compile, preview, and download.
import './typst-init.ts';
import { validate, type Field, type RawOptions } from './options.ts';
import { compileTracker, type Compiled } from './typst-engine.ts';
import { loadPreviewDocument, renderPreview, type PreviewDocument } from './preview.ts';
import { debugLog } from './debug-overlay.ts';

const form = document.querySelector<HTMLFormElement>('#options')!;
const preview = document.querySelector<HTMLDivElement>('#preview')!;
const warning = document.querySelector<HTMLParagraphElement>('#warning')!;
const messages = document.querySelector<HTMLUListElement>('#messages')!;
const download = document.querySelector<HTMLButtonElement>('#download')!;
const previewSection = document.querySelector<HTMLElement>('#preview-section')!;

// Newest request wins (T023): a slow earlier compile can't overwrite a newer preview.
let latestRequest = 0;
// The newest valid compile and the request that produced it; the download and preview use it (T019, T036).
let latestValid: Compiled | null = null;
let latestValidRequest = 0;
let renderQueue: Promise<void> = Promise.resolve();
// Valid updates still in flight; aria-busy stays "true" until this returns to zero (T005).
let pendingUpdates = 0;
// The PDF.js document for latestValid, parsed once per compile and reused across every re-fit (resize) —
// re-parsing per re-fit raced the PDF.js worker on slow mobile connections.
let latestDoc: PreviewDocument | null = null;

// Re-draws the last compiled PDF at the current container size, without recompiling or re-parsing — used
// on resize (below). Reads `latestDoc` lazily inside the queued step so a redraw queued before a newer
// compile finishes still ends up drawing whatever is truly latest (FR-003).
function reRenderLatest(): void {
  if (!latestDoc) return;
  pendingUpdates++;
  previewSection.setAttribute('aria-busy', 'true');
  renderQueue = renderQueue
    .then(() => (latestDoc ? renderPreview(latestDoc, preview) : undefined))
    .catch((error: unknown) => {
      console.error('Preview render failed; the previous preview stays on screen.', error);
    })
    .finally(() => {
      pendingUpdates--;
      if (pendingUpdates === 0) previewSection.setAttribute('aria-busy', 'false');
    });
}

// #preview's own box (not #preview-section) already reflects whatever space is left after the
// (possibly hidden) #warning banner, since it's sized via CSS flex, not computed here (research.md §2).
new ResizeObserver(() => reRenderLatest()).observe(preview);

function readForm(): RawOptions {
  const value = (name: Field) =>
    (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement).value;
  return {
    layout: value('layout'),
    habits: value('habits'),
    days: value('days'),
    perRow: value('perRow'),
    dotDiameterMm: value('dotDiameterMm'),
    dotSpacingMm: value('dotSpacingMm'),
    paper: value('paper'),
  };
}

function showErrors(errors: Partial<Record<Field, string>>): void {
  messages.replaceChildren(
    ...Object.values(errors).map((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }),
  );
  for (const input of form.querySelectorAll<HTMLInputElement>('input')) {
    input.setAttribute('aria-invalid', String(input.name in errors));
  }
}

async function update(): Promise<void> {
  const request = ++latestRequest;
  const result = validate(readForm());
  showErrors(result.ok ? {} : result.errors);
  // Any change disables download until the newest compile finishes, so the PDF always matches the form (T037).
  download.disabled = true;

  if (!result.ok) {
    // Keep the last valid preview on screen (FR-012); download stays disabled.
    warning.hidden = true;
    return;
  }

  pendingUpdates++;
  previewSection.setAttribute('aria-busy', 'true');
  try {
    debugLog('compile start', request);
    const compiled = await compileTracker(result.options);
    debugLog('compile ok', { pages: compiled.pageCount, bytes: compiled.pdf.length });
    // An older valid compile never replaces a newer one (T023).
    if (request < latestValidRequest) return;

    latestValidRequest = request;
    latestValid = compiled;
    // Warning and download follow the newest input only; a later invalid input owns them (FR-012).
    if (request === latestRequest) {
      warning.hidden = !compiled.overflowing;
      download.disabled = compiled.overflowing;
    }
    // Renders are queued so an older render can never finish after a newer one (T023). A valid layout
    // is still drawn when a later input is invalid, so the preview never lags the last valid options (T036).
    // A failed render is logged and skipped, so it cannot stop later renders from running (US2/AC3, T038).
    // The count attributes are set only after a render succeeds, so they describe the layout on the canvas.
    renderQueue = renderQueue
      .then(async () => {
        if (request !== latestValidRequest) return;
        const doc = await loadPreviewDocument(compiled.pdf);
        if (request !== latestValidRequest) {
          // A newer compile already won while this one was parsing; discard this document unused.
          await doc.destroy();
          return;
        }
        const previousDoc = latestDoc;
        latestDoc = doc;
        if (previousDoc) await previousDoc.destroy();
        debugLog('render start', {
          previewW: preview.clientWidth,
          previewH: preview.clientHeight,
          sectionW: previewSection.clientWidth,
          sectionH: previewSection.clientHeight,
        });
        await renderPreview(doc, preview);
        debugLog('render ok', { canvas: !!preview.querySelector('canvas') });
        previewSection.dataset.habits = String(result.options.habits);
        previewSection.dataset.days = String(result.options.days);
      })
      .catch((error: unknown) => {
        console.error('Preview render failed; the previous preview stays on screen.', error);
        debugLog('render FAILED', error);
      });
    await renderQueue;
  } finally {
    pendingUpdates--;
    if (pendingUpdates === 0) previewSection.setAttribute('aria-busy', 'false');
  }
}

download.addEventListener('click', () => {
  if (!latestValid || latestValid.overflowing) return;
  const url = URL.createObjectURL(
    new Blob([Uint8Array.from(latestValid.pdf)], { type: 'application/pdf' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'habit-grid.pdf';
  link.click();
  URL.revokeObjectURL(url);
});

form.addEventListener('input', () => {
  void update();
});

void update();
