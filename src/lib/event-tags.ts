export function partitionEventTags(tags: string[], visibleLimit = 4) {
  const safeLimit = Math.max(0, Math.floor(visibleLimit));
  return {
    visibleTags: tags.slice(0, safeLimit),
    hiddenTags: tags.slice(safeLimit),
  };
}
