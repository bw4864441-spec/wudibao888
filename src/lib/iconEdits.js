export function applyIconEdits(catalog, deletedIds, replacements) {
  const deleted = new Set(deletedIds);

  return catalog
    .filter((icon) => !deleted.has(icon.id))
    .map((icon) => replacements[icon.id]
      ? { ...icon, src: replacements[icon.id], replaced: true }
      : icon);
}
