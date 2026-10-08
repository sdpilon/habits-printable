// Pure scale-math for the preview's fit modes (contracts/preview-fit.md). No DOM access.
export type FitMode = 'page' | 'height' | 'width';

export interface Size {
  width: number;
  height: number;
}

export interface PreviewScale {
  scale: number;
  displayWidth: number;
  displayHeight: number;
}

export function computePreviewScale(page: Size, container: Size, mode: FitMode): PreviewScale {
  const scale =
    mode === 'page'
      ? Math.min(container.width / page.width, container.height / page.height)
      : mode === 'height'
        ? container.height / page.height
        : container.width / page.width;

  return {
    scale,
    displayWidth: page.width * scale,
    displayHeight: page.height * scale,
  };
}
