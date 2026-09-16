export function sharedCatalogUrl(basePath, cacheKey) {
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  const src = `${normalizedBase}catalog.json`;
  return cacheKey ? `${src}?v=${encodeURIComponent(cacheKey)}` : src;
}

export function sharedIconSrc(basePath, asset, version) {
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  const relativePath = asset?.includes("/") ? asset : `assets/user-icons/${asset}`;
  const src = `${normalizedBase}${relativePath.split("/").map(encodeURIComponent).join("/")}`;
  return version ? `${src}?v=${encodeURIComponent(version)}` : src;
}

export function hydrateSharedIcons(basePath, sharedIcons, version) {
  return sharedIcons.map((icon) => ({
    ...icon,
    src: sharedIconSrc(basePath, icon.src || icon.filename, version),
  }));
}

export function mergeSharedIcons(builtInIcons, sharedIcons) {
  const builtInIds = new Set(builtInIcons.map((icon) => icon.id));
  return [...builtInIcons, ...sharedIcons.filter((icon) => !builtInIds.has(icon.id))];
}
