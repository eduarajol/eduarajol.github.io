// Tiny renderer for the portfolio pages: {{holes}}, <sc-if>, <sc-for>, on* handlers.
// Re-renders patch the existing DOM in place, so CSS transitions and scroll positions survive state changes.
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

  // Each element keeps its handlers in el.__h; one listener per event type reads them, so patching only swaps the map.
  function bind(el, type) {
    el.__ht = el.__ht || {};
    if (el.__ht[type]) return;
    el.__ht[type] = true;
    el.addEventListener(type, (e) => { const f = el.__h && el.__h[type]; if (f) f(e); });
  }

  function endsBlock(node) {
    for (let n = node.nextSibling; n; n = n.nextSibling) {
      if (n.nodeType === 1) return false;
      if (n.nodeType === 3 && n.nodeValue.trim()) return false;
    }
    return true;
  }

  function walk(node, ctx, out) {
    if (node.nodeType === 3) {
      let v = fill(node.nodeValue, ctx);
      // Keep the last two words of a block together, so no line ends up holding a single word.
      if (endsBlock(node)) v = v.replace(/ (\S+\s*)$/, '\u00a0$1');
      out.appendChild(document.createTextNode(v));
      return;
    }
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
    el.__h = {};
    for (const a of Array.from(el.attributes)) {
      if (a.name.startsWith('hint-')) { el.removeAttribute(a.name); continue; }
      if (a.name.startsWith('on')) {
        const fn = look(single(a.value) || '', ctx);
        el.removeAttribute(a.name);
        if (typeof fn === 'function') el.__h[a.name.slice(2)] = fn;
        continue;
      }
      if (a.value.indexOf('{{') !== -1) el.setAttribute(a.name, fill(a.value, ctx));
    }
    for (const c of node.childNodes) walk(c, ctx, el);
    out.appendChild(el);
  }

  function live(el) { for (const t of Object.keys(el.__h || {})) bind(el, t); for (const c of el.children) live(c); }

  function same(a, b) { return a.nodeType === b.nodeType && (a.nodeType !== 1 || a.localName === b.localName); }

  function patchNode(old, nu) {
    if (old.nodeType === 3) { if (old.nodeValue !== nu.nodeValue) old.nodeValue = nu.nodeValue; return; }
    for (const a of Array.from(old.attributes)) if (!nu.hasAttribute(a.name)) old.removeAttribute(a.name);
    for (const a of Array.from(nu.attributes)) if (old.getAttribute(a.name) !== a.value) old.setAttribute(a.name, a.value);
    old.__h = nu.__h;
    for (const t of Object.keys(nu.__h || {})) bind(old, t);
    patchChildren(old, Array.from(nu.childNodes));
  }

  function patchChildren(parent, nodes) {
    let i = 0;
    for (; i < nodes.length; i++) {
      const old = parent.childNodes[i], nu = nodes[i];
      if (old && same(old, nu)) patchNode(old, nu);
      else { if (nu.nodeType === 1) live(nu); parent.insertBefore(nu, old || null); }
    }
    while (parent.childNodes.length > i) parent.removeChild(parent.lastChild);
  }

  window.addEventListener('DOMContentLoaded', () => {
    const tpl = document.getElementById('dc-template');
    const mount = document.getElementById('dc-root');
    const comp = typeof Component === 'function' ? new Component(window.DC_PROPS || {}) : null;
    let first = true;
    const render = () => {
      const vals = comp ? comp.renderVals() : {};
      const frag = document.createDocumentFragment();
      for (const c of tpl.content.childNodes) walk(c, vals, frag);
      if (first) { for (const c of frag.children) live(c); mount.replaceChildren(frag); first = false; }
      else patchChildren(mount, Array.from(frag.childNodes));
      document.dispatchEvent(new CustomEvent('dc:render'));
    };
    if (comp) comp.__render = render;
    render();
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  });
})();

// Desktop layout is 1440px wide. Between phone and desktop widths, scale it down to fit;
// phones (760px and below) get the dedicated mobile layout from the stylesheet instead.
(function () {
  const MOBILE = 760;
  const fit = () => {
    const w = document.documentElement.clientWidth || window.innerWidth;
    const z = w > MOBILE && w < 1440 ? String(w / 1440) : '';
    if (document.body) document.body.style.zoom = z;
  };
  window.addEventListener('DOMContentLoaded', fit);
  window.addEventListener('resize', fit);
})();
