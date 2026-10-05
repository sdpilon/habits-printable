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
// The newest valid compile; the download always uses it (T019).
let latestValid: Compiled | null = null;
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

  if (!result.ok) {
    // Keep the last valid preview on screen (FR-012); download stays disabled.
    download.disabled = true;
    warning.hidden = true;
    return;
  }

  const compiled = await compileTracker(result.options);
  if (request !== latestRequest) return;

  latestValid = compiled;
  warning.hidden = !compiled.overflowing;
  download.disabled = compiled.overflowing;
  // Renders are queued so an older render can never finish after a newer one (T023).
  renderQueue = renderQueue.then(() => {
    if (request === latestRequest) return renderPreview(preview, compiled.pdf);
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
