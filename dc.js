// Tiny renderer for the portfolio pages: {{holes}}, <sc-if>, <sc-for>, onClick handlers.
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(patch) { Object.assign(this.state, patch); if (this.__render) this.__render(); }
}
(function () {
  const HOLE = /\{\{([^}]+)\}\}/g;
  const look = (path, ctx) => {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    let cur = ctx;
    for (const p of path.split('.')) { if (cur == null) return undefined; cur = cur[p]; }
    return cur;
  };
  const fill = (str, ctx) => str.replace(HOLE, (_, p) => { const v = look(p, ctx); return v == null ? '' : String(v); });
  const single = (str) => { const m = /^\s*\{\{([^}]+)\}\}\s*$/.exec(str); return m ? m[1] : null; };

  function walk(node, ctx, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(fill(node.nodeValue, ctx))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.localName;
    if (tag === 'sc-if') {
      if (look(single(node.getAttribute('value')) || 'false', ctx)) for (const c of node.childNodes) walk(c, ctx, out);
      return;
    }
    if (tag === 'sc-for') {
      const list = look(single(node.getAttribute('list')), ctx) || [];
      const as = node.getAttribute('as');
      for (const item of list) { const c2 = Object.assign({}, ctx, { [as]: item }); for (const c of node.childNodes) walk(c, c2, out); }
      return;
    }
    const el = node.cloneNode(false);
    for (const a of Array.from(el.attributes)) {
      if (a.name.startsWith('hint-')) { el.removeAttribute(a.name); continue; }
      if (a.name.startsWith('on')) {
        const fn = look(single(a.value) || '', ctx);
        el.removeAttribute(a.name);
        if (typeof fn === 'function') el.addEventListener(a.name.slice(2), fn);
        continue;
      }
      if (a.value.indexOf('{{') !== -1) el.setAttribute(a.name, fill(a.value, ctx));
    }
    for (const c of node.childNodes) walk(c, ctx, el);
    out.appendChild(el);
  }

  window.addEventListener('DOMContentLoaded', () => {
    const tpl = document.getElementById('dc-template');
    const mount = document.getElementById('dc-root');
    const comp = typeof Component === 'function' ? new Component(window.DC_PROPS || {}) : null;
    const render = () => {
      const vals = comp ? comp.renderVals() : {};
      const frag = document.createDocumentFragment();
      for (const c of tpl.content.childNodes) walk(c, vals, frag);
      mount.replaceChildren(frag);
    };
    if (comp) comp.__render = render;
    render();
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  });
})();
// Pages are designed at 1440px: on narrower windows scale the whole page down instead of scrolling sideways.
(function () {
  const fit = () => { const w = document.documentElement.clientWidth || window.innerWidth; document.body && (document.body.style.zoom = w < 1440 ? String(w / 1440) : ''); };
  window.addEventListener('DOMContentLoaded', fit);
  window.addEventListener('resize', fit);
})();
