export function sharedCatalogUrl(basePath) {
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return `${normalizedBase}catalog.json`;
}

export function sharedIconSrc(basePath, asset) {
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  const relativePath = asset?.includes("/") ? asset : `assets/user-icons/${asset}`;
  return `${normalizedBase}${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

export function hydrateSharedIcons(basePath, sharedIcons) {
  return sharedIcons.map((icon) => ({ ...icon, src: sharedIconSrc(basePath, icon.src || icon.filename) }));
}

export function mergeSharedIcons(builtInIcons, sharedIcons) {
  const builtInIds = new Set(builtInIcons.map((icon) => icon.id));
  return [...builtInIcons, ...sharedIcons.filter((icon) => !builtInIds.has(icon.id))];
}
