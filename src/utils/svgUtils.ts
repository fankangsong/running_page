export async function loadSvgComponent(
  modules: Record<string, () => Promise<any>>,
  path: string
) {
  const loadByKey = async (key: string) => {
    const loaded = await modules[key]();
    if (loaded && typeof loaded === 'object' && 'default' in loaded) {
      return loaded;
    }
    return { default: loaded };
  };

  if (modules[path]) {
    return loadByKey(path);
  }
  const normalized = path.replace(/^\.\//, '');
  const matchKey = Object.keys(modules).find((k) => {
    if (k === normalized) return true;
    if (k.endsWith(path)) return true;
    if (k.endsWith(normalized)) return true;
    if (k.endsWith(`/${normalized}`)) return true;
    return false;
  });
  if (matchKey) {
    return loadByKey(matchKey);
  }
  throw new Error(
    `SVG component not found for path: ${path}. Available keys: ${Object.keys(
      modules
    )
      .slice(0, 10)
      .join(', ')}`
  );
}
