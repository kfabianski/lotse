/** Colour scheme chosen by the admin: an attribute on <html> that switches the colour tokens. Cached so the next
 * load paints in the right colours at once. */
export function applyScheme(scheme, { cache = true } = {}) {
  const s = scheme || 'hafen';
  document.documentElement.dataset.scheme = s;
  if (cache) try { localStorage.setItem('lotse-scheme', s); } catch { /* ignore */ }
}
