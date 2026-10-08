// Pure scale-math for fitting the preview (contracts/preview-fit.md). No DOM access.
export interface Size {
  width: number;
  height: number;
}

export interface PreviewScale {
  scale: number;
  displayWidth: number;
  displayHeight: number;
}

export function computePreviewScale(page: Size, container: Size): PreviewScale {
  const scale = Math.min(container.width / page.width, container.height / page.height);

  return {
    scale,
    displayWidth: page.width * scale,
    displayHeight: page.height * scale,
  };
}
