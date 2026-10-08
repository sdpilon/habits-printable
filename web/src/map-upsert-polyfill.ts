// pdfjs-dist 6.x calls Map.prototype.getOrInsertComputed internally (the TC39 Map "upsert" proposal),
// which Firefox/Gecko doesn't implement yet (confirmed missing on Firefox 143, e.g. IronFox / Firefox for
// Android) — this crashed rendering there with "getOrInsertComputed is not a function", silently, since the
// failure was a swallowed promise rejection. Chrome already ships it, which is why only Firefox-based
// browsers hit this. Needed in both the main thread and the PDF.js worker's own realm.
export function installMapUpsertPolyfill(): void {
  const proto = Map.prototype as unknown as Record<string, unknown>;
  if (!proto.getOrInsertComputed) {
    proto.getOrInsertComputed = function (this: Map<unknown, unknown>, key: unknown, fn: (key: unknown) => unknown) {
      if (!this.has(key)) this.set(key, fn(key));
      return this.get(key);
    };
  }
}
