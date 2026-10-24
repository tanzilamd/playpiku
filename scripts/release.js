// Keep the module graph coherent when an older arcade release is cached.
export function versionModule(source, release) {
  return source.replace(
    /(['"`])((?:\.{1,2}\/)[^'"`\n]+\.js)\1/g,
    (_, quote, path) => `${quote}${path}?v=${release}${quote}`,
  );
}
export function versionEntry(html, release) {
  return html
    .replace('href="./src/styles.css"', `href="./src/styles.css?v=${release}"`)
    .replace('src="./src/app.js"', `src="./src/app.js?v=${release}"`);
}
