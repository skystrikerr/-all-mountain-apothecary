// Minimal DOM/canvas stub so level-building code (which paints canvas textures) runs under Node.
const ctx = new Proxy({}, {
  get(t, k) {
    if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (k === 'measureText') return () => ({ width: 10 });
    if (k in t) return t[k];
    return () => {};
  },
  set(t, k, v) { t[k] = v; return true; },
});
globalThis.document ??= {
  createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx, addEventListener() {} }),
};
globalThis.localStorage ??= { getItem: () => null, setItem() {} };
