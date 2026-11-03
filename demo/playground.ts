// Reuse the gallery runtime for recipes; keep the four-layer composer available.
if (new URLSearchParams(location.search).has('example')) {
  await import('../examples/gallery/main.js');
} else {
  await import('./main.js');
}
export {};
