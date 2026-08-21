export function sharedCatalogUrl(basePath) {
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return `${normalizedBase}catalog.json`;
}

export function sharedIconSrc(basePath, filename) {
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return `${normalizedBase}assets/user-icons/${encodeURIComponent(filename)}`;
}

export function hydrateSharedIcons(basePath, sharedIcons) {
  return sharedIcons.map((icon) => ({ ...icon, src: sharedIconSrc(basePath, icon.filename) }));
}

export function mergeSharedIcons(builtInIcons, sharedIcons) {
  const builtInIds = new Set(builtInIcons.map((icon) => icon.id));
  return [...builtInIcons, ...sharedIcons.filter((icon) => !builtInIds.has(icon.id))];
}
