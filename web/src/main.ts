// Wires the options form to validation, compile, preview, and download.
import './typst-init.ts';
import { validate, type Field, type RawOptions } from './options.ts';
import { compileTracker, type Compiled } from './typst-engine.ts';
import { renderPreview } from './preview.ts';

const form = document.querySelector<HTMLFormElement>('#options')!;
const preview = document.querySelector<HTMLDivElement>('#preview')!;
const warning = document.querySelector<HTMLParagraphElement>('#warning')!;
const messages = document.querySelector<HTMLUListElement>('#messages')!;
const download = document.querySelector<HTMLButtonElement>('#download')!;

// Newest request wins (T023): a slow earlier compile can't overwrite a newer preview.
let latestRequest = 0;
// The newest valid compile and the request that produced it; the download and preview use it (T019, T036).
let latestValid: Compiled | null = null;
let latestValidRequest = 0;
let renderQueue: Promise<void> = Promise.resolve();

function readForm(): RawOptions {
  const value = (name: Field) => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement).value;
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
  messages.replaceChildren(...Object.values(errors).map((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
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

  const compiled = await compileTracker(result.options);
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
  renderQueue = renderQueue.then(() => {
    if (request !== latestValidRequest) return;
    return renderPreview(preview, compiled.pdf).catch((error: unknown) => {
      console.error('Preview render failed; the previous preview stays on screen.', error);
    });
  });
  await renderQueue;
}

download.addEventListener('click', () => {
  if (!latestValid || latestValid.overflowing) return;
  const url = URL.createObjectURL(new Blob([Uint8Array.from(latestValid.pdf)], { type: 'application/pdf' }));
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
