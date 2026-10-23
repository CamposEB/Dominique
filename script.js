'use strict';

/* ============================================================
   DOMINIQUE MODAS — script.js (versão otimizada)
   ------------------------------------------------------------
   Removido: Lenis (scroll hijack), GSAP + ScrollTrigger,
   cursor customizado (agora só via CSS opt-in), botões magnéticos,
   tilt 3D e will-change massivo.
   Mantido: tema, WhatsApp, header, menu, progresso, filtros,
   favoritos, quick view, modais, lookbook drag, scrollspy.
   ------------------------------------------------------------
   Se o JS falhar, o site continua legível e navegável.
   ============================================================ */

const CONFIG = {
  whatsapp: {
    numero: '5521989512181',
    mensagemPadrao: 'Olá! Vi o site da Dominique Modas e gostaria de saber mais.',
  },
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = () => window.matchMedia('(hover: none)').matches;

/* Detecta hardware fraco: celulares e notebooks antigos */
function isLowPower() {
  if (prefersReducedMotion) return true;
  if (window.matchMedia('(max-width: 899px)').matches) return true;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return true;
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return true;
  return false;
}

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function escapeAttr(str) { return escapeHtml(str).replace(/\n/g, ' '); }

function placeholderSVG(name, category) {
  // Cores claras (areia/creme)
  const palette = {
    meninas: ['#F2EBE2', '#D9C3A5'],
    meninos: ['#E8D4B8', '#C7A17A'],
  };
  const [c1, c2] = palette[category] || palette.meninas;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 750'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>
    </linearGradient></defs>
    <rect width='600' height='750' fill='url(#g)'/>
    <text x='300' y='380' text-anchor='middle' font-family='Georgia, serif' font-size='88'
          font-weight='500' fill='rgba(123, 63, 58, 0.75)' letter-spacing='-4'>DM</text>
    <text x='300' y='650' text-anchor='middle' font-family='Helvetica, Arial, sans-serif'
          font-size='20' fill='rgba(90, 44, 40, 0.85)'>${escapeHtml(name)}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const PRODUCTS_FALLBACK = [
  { id: 'F-001', name: 'Item 1', category: 'meninas', price: 'R$ 100,00', sizes: [], badge: 'Novo', image: '', alt: 'Item 1' },
  { id: 'M-001', name: 'Item 2', category: 'meninos', price: 'R$ 100,00', sizes: [], badge: '', image: '', alt: 'Item 2' },
];

const state = {
  products: [],
  filterCat: 'all',
  filterSize: 'all',
  favorites: new Set(),
};

/* ============================================================
   1. TEMA
   ============================================================ */
function initTheme() {
  const html = document.documentElement;
  const btn = $('#theme-toggle');
  if (!btn) return;
  const sync = () => {
    const dark = html.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('dm:theme', { detail: dark ? 'dark' : 'light' }));
  };
  sync();
  btn.addEventListener('click', () => {
    const dark = html.getAttribute('data-theme') === 'dark';
    if (dark) { html.removeAttribute('data-theme'); localStorage.setItem('dm-theme', 'light'); }
    else { html.setAttribute('data-theme', 'dark'); localStorage.setItem('dm-theme', 'dark'); }
    sync();
  });
}

/* ============================================================
   2. WHATSAPP
   ============================================================ */
function applyWhatsAppLinks(scope = document) {
  $$('[data-wa]', scope).forEach((el) => {
    const msg = el.dataset.waMensagem || CONFIG.whatsapp.mensagemPadrao;
    el.href = `https://wa.me/${CONFIG.whatsapp.numero}?text=${encodeURIComponent(msg)}`;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  });
}

/* ============================================================
   3. HEADER + PROGRESSO
   ============================================================ */
function initHeader() {
  const header = $('.header');
  const progress = $('#progress');
  let ticking = false;

  const upd = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle('header--scrolled', y > 24);
    if (progress) {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const pct = total > 0 ? Math.min(1, y / total) : 0;
      progress.style.transform = `scaleX(${pct})`;
    }
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(upd);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  upd();
}

/* ============================================================
   4. MENU MOBILE
   ============================================================ */
function initMenu() {
  const toggle = $('.menu-toggle');
  const nav = $('.nav');
  if (!toggle || !nav) return;

  const fechar = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
    document.body.style.overflow = '';
  };
  const abrir = () => {
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fechar menu');
    document.body.style.overflow = 'hidden';
  };

  toggle.addEventListener('click', () => {
    nav.classList.contains('is-open') ? fechar() : abrir();
  });
  $$('.nav__list a, .nav__cta', nav).forEach((l) => l.addEventListener('click', fechar));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      fechar();
      toggle.focus();
    }
  });
}

/* ============================================================
   5. SCROLLSPY
   ============================================================ */
function initScrollspy() {
  const links = $$('[data-nav]');
  if (!links.length) return;
  const secoes = links.map((l) => $(l.getAttribute('href'))).filter(Boolean);
  if (!secoes.length) return;
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = '#' + e.target.id;
        links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === id));
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );
  secoes.forEach((s) => obs.observe(s));
}

/* ============================================================
   6. REVELAÇÃO AO ROLAR
   ============================================================ */
function initReveal() {
  const els = $$('.section-head.reveal, .contact__text.reveal, .contact__list.reveal');
  if (!els.length) return;
  if (prefersReducedMotion || isLowPower()) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );
  els.forEach((el) => obs.observe(el));
}

/* ============================================================
   7. CURSOR CUSTOMIZADO (desativado por padrão)
   ============================================================ */
function initCursor() {
  return; // cursor customizado desativado
}

/* ============================================================
   8. BOTÕES MAGNÉTICOS
   ============================================================ */
function initMagnetic() {
  if (isLowPower() || isTouch() || prefersReducedMotion) return;
  $$('[data-magnetic]').forEach((el) => {
    let rafId = null;
    let tx = 0, ty = 0;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - r.left - r.width / 2) * 0.15;
      ty = (e.clientY - r.top - r.height / 2) * 0.15;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          el.style.transform = `translate(${tx}px, ${ty}px)`;
          rafId = null;
        });
      }
    }, { passive: true });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}

/* ============================================================
   9. PRODUTOS
   ============================================================ */
async function loadProducts() {
  try {
    const res = await fetch('products.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (Array.isArray(data.products) && data.products.length) return data.products;
    return PRODUCTS_FALLBACK;
  } catch {
    return PRODUCTS_FALLBACK;
  }
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem('dm-favorites');
    if (raw) state.favorites = new Set(JSON.parse(raw));
  } catch { /* ignore */ }
}
function saveFavorites() {
  try { localStorage.setItem('dm-favorites', JSON.stringify([...state.favorites])); }
  catch { /* ignore */ }
}

function buildProductMessage(p) {
  let msg = `Olá! Vi no site da Dominique Modas a peça "${p.name}" (${p.price})`;
  
  if (p.sizes && p.sizes.length > 0) {
    msg += ` — tamanhos ${p.sizes.join(', ')}`;
  } else {
    msg += ` — e gostaria de consultar os tamanhos disponíveis`;
  }
  
  msg += ` e saber mais sobre disponibilidade.`;
  return msg;
}

function renderProducts() {
  const grid = $('#products-grid');
  if (!grid) return;

  grid.innerHTML = state.products.map((p) => {
    const img = p.image ? escapeAttr(p.image) : placeholderSVG(p.name, p.category);
    const onerr = p.image
      ? `this.onerror=null;this.src='${placeholderSVG(p.name, p.category).replace(/'/g, '%27')}';`
      : '';
    const badge = p.badge ? `<span class="product__badge">${escapeHtml(p.badge)}</span>` : '';
    const sizes = (p.sizes || []);
    const isFav = state.favorites.has(p.id);

    return `
      <article class="product tilt" data-id="${escapeAttr(p.id)}" data-cat="${p.category}" data-sizes="${escapeAttr(sizes.join(','))}">
        <button class="product__fav${isFav ? ' is-active' : ''}" type="button" data-fav="${escapeAttr(p.id)}" aria-label="Favoritar ${escapeAttr(p.name)}" aria-pressed="${isFav}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <button class="product__media" type="button" data-qv="${escapeAttr(p.id)}" aria-label="Ver detalhes de ${escapeAttr(p.name)}">
          ${badge}
          <img src="${img}" alt="${escapeAttr(p.alt || p.name)}"
               loading="lazy" decoding="async" width="600" height="750"
               ${onerr ? `onerror="${onerr}"` : ''}>
        </button>
        <div class="product__body">
          <h3 class="product__name">${escapeHtml(p.name)}</h3>
          <p class="product__price">${escapeHtml(p.price)}</p>
          ${sizes.length ? `<p class="product__sizes"><strong>Tamanhos:</strong> ${sizes.map(escapeHtml).join(' · ')}</p>` : ''}
          <div class="product__actions">
            <a class="btn btn--primary product__cta"
               href="https://wa.me/${CONFIG.whatsapp.numero}"
               data-wa
               data-wa-mensagem="${escapeAttr(buildProductMessage(p))}"
               target="_blank" rel="noopener noreferrer">
              <svg class="icone-wa" aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.94L.06 24l6.31-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.9a11.82 11.82 0 0 0-3.48-8.41"/></svg>
              Pedir
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  applyWhatsAppLinks(grid);
  bindProductActions(grid);
  applyFilter();
}

function bindProductActions(scope) {
  $$('[data-fav]', scope).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.fav;
      if (state.favorites.has(id)) state.favorites.delete(id);
      else state.favorites.add(id);
      saveFavorites();
      btn.classList.toggle('is-active', state.favorites.has(id));
      btn.setAttribute('aria-pressed', state.favorites.has(id));
      updateFavCount();
    });
  });
  $$('[data-qv]', scope).forEach((btn) => {
    btn.addEventListener('click', () => openQuickView(btn.dataset.qv));
  });
}

/* ============================================================
   10. FILTROS
   ============================================================ */
function applyFilter() {
  const cards = $$('.product');
  let visible = 0;
  cards.forEach((card) => {
    const cat = card.dataset.cat;
    const sizes = (card.dataset.sizes || '').split(',').filter(Boolean);
    const okCat = state.filterCat === 'all' || cat === state.filterCat;
    const okSize = state.filterSize === 'all' || sizes.includes(state.filterSize);
    const show = okCat && okSize;
    card.hidden = !show;
    if (show) visible++;
  });
  const contador = $('#contador');
  if (contador) contador.textContent = `${visible} ${visible === 1 ? 'peça' : 'peças'}`;
  const vazio = $('#vazio');
  if (vazio) vazio.hidden = visible !== 0;
}

function updateFilterButtons(type, val) {
  const selector = type === 'cat' ? '[data-cat]' : '[data-size]';
  $$(selector).forEach((b) => {
    const active = b.dataset[type] === val;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function initFilters() {
  $$('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.cat;
      state.filterCat = val;
      updateFilterButtons('cat', val);
      applyFilter();
    });
  });
  $$('[data-size]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.size;
      state.filterSize = val;
      updateFilterButtons('size', val);
      applyFilter();
    });
  });
  const reset = $('[data-reset]');
  if (reset) {
    reset.addEventListener('click', () => {
      state.filterCat = 'all';
      state.filterSize = 'all';
      updateFilterButtons('cat', 'all');
      updateFilterButtons('size', 'all');
      applyFilter();
    });
  }
  $$('[data-goto-cat]').forEach((link) => {
    link.addEventListener('click', () => {
      const cat = link.dataset.gotoCat;
      if (!cat) return;
      state.filterCat = cat;
      state.filterSize = 'all';
      updateFilterButtons('cat', cat);
      updateFilterButtons('size', 'all');
      applyFilter();
    });
  });
}

/* ============================================================
   11. QUICK VIEW
   ============================================================ */
function openQuickView(id) {
  const product = state.products.find((p) => p.id === id);
  const modal = $('#quick-view');
  const body = $('#qv-body');
  if (!product || !modal || !body) return;

  const sizes = product.sizes || [];
  const colors = product.colors || [];

  const sizesHtml = sizes.length ? `
    <div class="qv__section">
      <span class="qv__label">Tamanho</span>
      <div class="qv__chips" role="group" aria-label="Escolha o tamanho">
        ${sizes.map((s, i) => `<button class="chip${i === 0 ? ' is-active' : ''}" type="button" data-qv-size="${escapeAttr(s)}" aria-pressed="${i === 0}">${escapeHtml(s)}</button>`).join('')}
      </div>
    </div>` : '';

  const colorsHtml = colors.length ? `
    <div class="qv__section">
      <span class="qv__label">Cor</span>
      <div class="qv__chips qv__chips--color" role="group" aria-label="Escolha a cor">
        ${colors.map((c, i) => `<button class="chip chip--color${i === 0 ? ' is-active' : ''}" type="button" data-qv-color="${escapeAttr(c.name)}" style="--c:${escapeAttr(c.hex || '#7B3F3A')}" aria-label="${escapeAttr(c.name)}" aria-pressed="${i === 0}" title="${escapeAttr(c.name)}"></button>`).join('')}
      </div>
    </div>` : '';

  const img = product.image ? escapeAttr(product.image) : placeholderSVG(product.name, product.category);
  const onerr = product.image
    ? `this.onerror=null;this.src='${placeholderSVG(product.name, product.category).replace(/'/g, '%27')}';`
    : '';

  body.innerHTML = `
    <div class="qv">
      <div class="qv__media">
        <img src="${img}" alt="${escapeAttr(product.alt || product.name)}" width="600" height="750" ${onerr ? `onerror="${onerr}"` : ''}>
      </div>
      <div class="qv__info">
        <p class="qv__cat">${escapeHtml({meninas:'Meninas', meninos:'Meninos'}[product.category] || '')}</p>
        <h2 class="qv__name" id="qv-name">${escapeHtml(product.name)}</h2>
        <p class="qv__price">${escapeHtml(product.price)}</p>
        ${product.description ? `<p class="qv__desc">${escapeHtml(product.description)}</p>` : ''}
        ${sizesHtml}
        ${colorsHtml}
        <a class="btn btn--primary btn--lg qv__cta" href="https://wa.me/${CONFIG.whatsapp.numero}"
           data-wa data-wa-mensagem="${escapeAttr(buildProductMessage(product))}"
           target="_blank" rel="noopener noreferrer">
          <svg class="icone-wa" aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.94L.06 24l6.31-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.9a11.82 11.82 0 0 0-3.48-8.41"/></svg>
          Pedir no WhatsApp
        </a>
      </div>
    </div>
  `;

  applyWhatsAppLinks(body);

  let selSize = sizes[0] || '';
  let selColor = colors[0]?.name || '';
  
  $$('[data-qv-size]', body).forEach((c) => {
    c.addEventListener('click', () => {
      $$('[data-qv-size]', body).forEach((x) => { x.classList.remove('is-active'); x.setAttribute('aria-pressed', 'false'); });
      c.classList.add('is-active'); c.setAttribute('aria-pressed', 'true');
      selSize = c.dataset.qvSize;
      updateQvMessage(body, product, selSize, selColor);
    });
  });
  
  $$('[data-qv-color]', body).forEach((c) => {
    c.addEventListener('click', () => {
      $$('[data-qv-color]', body).forEach((x) => { x.classList.remove('is-active'); x.setAttribute('aria-pressed', 'false'); });
      c.classList.add('is-active'); c.setAttribute('aria-pressed', 'true');
      selColor = c.dataset.qvColor;
      updateQvMessage(body, product, selSize, selColor);
    });
  });

  if (typeof modal.showModal === 'function') modal.showModal();
  else modal.setAttribute('open', '');
}

function updateQvMessage(body, product, size, color) {
  let msg = `Olá! Vi no site da Dominique Modas a peça "${product.name}" (${product.price})`;
  if (size) msg += ` — tamanho ${size}`;
  if (color) msg += ` · cor ${color}`;
  
  if (!size && product.sizes && product.sizes.length === 0) {
    msg += ` — e gostaria de consultar os tamanhos disponíveis`;
  }
  
  msg += ' e saber mais sobre disponibilidade.';
  const cta = $('.qv__cta', body);
  if (cta) {
    cta.dataset.waMensagem = msg;
    applyWhatsAppLinks(body);
  }
}

/* ============================================================
   12. FAVORITOS
   ============================================================ */
function updateFavCount() {
  const el = $('#fav-count');
  if (el) el.textContent = state.favorites.size;
}

function buildFavoritesMessage(favs) {
  const lines = favs.map((p, i) => {
    let line = `${i + 1}. ${p.name} (${p.price})`;
    if (p.sizes && p.sizes.length > 0) {
      line += ` — tam. ${p.sizes.join(', ')}`;
    } else {
      line += ` — (consultar tamanho)`;
    }
    return line;
  });
  return `Olá! Separei algumas peças favoritas na Dominique Modas:\n\n${lines.join('\n')}\n\nPoderia me ajudar com disponibilidade?`;
}

function initFavorites() {
  updateFavCount();
  const openBtn = $('#fav-float');
  const modal = $('#fav-modal');
  const body = $('#fav-body');
  if (!openBtn || !modal || !body) return;

  openBtn.addEventListener('click', () => {
    const favs = state.products.filter((p) => state.favorites.has(p.id));
    if (!favs.length) {
      body.innerHTML = `<p class="fav-empty">Você ainda não favoritou nenhuma peça. Toque no coração dos produtos que ama.</p>`;
    } else {
      body.innerHTML = `
        <ul class="fav-list">
          ${favs.map((p) => {
            const sizeStr = (p.sizes && p.sizes.length > 0) ? p.sizes.join(', ') : 'Consultar';
            return `
            <li class="fav-item">
              <div class="fav-item__info">
                <strong>${escapeHtml(p.name)}</strong>
                <span>${escapeHtml(p.price)} · Tam. ${escapeHtml(sizeStr)}</span>
              </div>
              <button class="fav-item__remove" type="button" data-remove="${escapeAttr(p.id)}" aria-label="Remover ${escapeAttr(p.name)} dos favoritos">×</button>
            </li>
          `}).join('')}
        </ul>
        <a class="btn btn--primary btn--lg" href="https://wa.me/${CONFIG.whatsapp.numero}"
           data-wa data-wa-mensagem="${escapeAttr(buildFavoritesMessage(favs))}"
           target="_blank" rel="noopener noreferrer" style="margin-top:1.25rem;width:100%">
          <svg class="icone-wa" aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.94L.06 24l6.31-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.9a11.82 11.82 0 0 0-3.48-8.41"/></svg>
          Enviar minha lista pelo WhatsApp
        </a>
      `;
      applyWhatsAppLinks(body);
      $$('[data-remove]', body).forEach((b) => {
        b.addEventListener('click', () => {
          state.favorites.delete(b.dataset.remove);
          saveFavorites();
          updateFavCount();
          const prodBtn = $(`[data-fav="${b.dataset.remove}"]`);
          if (prodBtn) { prodBtn.classList.remove('is-active'); prodBtn.setAttribute('aria-pressed', 'false'); }
          openBtn.click();
        });
      });
    }
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  });
}

/* ============================================================
   13. FECHAR MODAIS
   ============================================================ */
function initModals() {
  $$('dialog.modal').forEach((m) => {
    m.addEventListener('click', (e) => {
      if (e.target === m) m.close();
    });
    const closeBtn = $('[data-close]', m);
    if (closeBtn) closeBtn.addEventListener('click', () => m.close());
  });
}

/* ============================================================
   14. MARQUEE (duplica para loop contínuo)
   ============================================================ */
function initMarquee() {
  const track = $('.marquee__track');
  if (!track) return;
  track.innerHTML += track.innerHTML;
}

/* ============================================================
   15. DRAG SCROLL (opcional para listas horizontais)
   ============================================================ */
function initDragScroll() {
  $$('.lookbook__track, .testimonials__track').forEach((el) => {
    let down = false, startX = 0, startScroll = 0;
    el.addEventListener('mousedown', (e) => {
      down = true; startX = e.pageX; startScroll = el.scrollLeft;
      el.style.cursor = 'grabbing';
    });
    el.addEventListener('mouseleave', () => { down = false; el.style.cursor = ''; });
    el.addEventListener('mouseup', () => { down = false; el.style.cursor = ''; });
    el.addEventListener('mousemove', (e) => {
      if (!down) return;
      e.preventDefault();
      el.scrollLeft = startScroll - (e.pageX - startX);
    });
  });
}

/* ============================================================
   16. ANO
   ============================================================ */
function initAno() {
  const el = $('#ano');
  if (el) el.textContent = new Date().getFullYear();
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  applyWhatsAppLinks();
  initHeader();
  initMenu();
  initScrollspy();
  initReveal();
  initCursor();
  initMagnetic();
  initMarquee();
  initModals();
  initFilters();
  initFavorites();
  initDragScroll();
  initAno();

  loadFavorites();
  state.products = await loadProducts();
  renderProducts();
});