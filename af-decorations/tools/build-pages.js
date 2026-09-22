// Builds the static, crawlable parts of the decorations tool from awards.js:
//   - one page per award at /af-decorations/<slug>/ (for search results)
//   - the award index and structured data inside af-decorations/index.html (between markers)
//   - /sitemap.xml for the whole site
//
// Run from the repo root after changing awards.js:   node af-decorations/tools/build-pages.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIR = path.join(ROOT, 'af-decorations');
const SITE = 'https://peterbrown.space';
const BASE = SITE + '/af-decorations/';
const TODAY = new Date().toISOString().slice(0, 10);

const AWARDS = new Function(fs.readFileSync(path.join(DIR, 'awards.js'), 'utf8') + '; return AWARDS;')();

const CATS = {
  personal: 'Personal decorations', unit: 'Unit awards', achievement: 'Achievement and conduct',
  campaign: 'Campaign and service', ribbons: 'Service and training ribbons', foreign: 'Foreign and international',
};
const KIND = { decoration: 'Decoration', unit: 'Unit award', service: 'Service award' };
const DEVICE_NAMES = { V: 'Valor "V" device', C: 'Combat "C" device', R: 'Remote "R" device' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = (name) => name.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// "Air and Space Achievement Medal" was renamed from "Air Force Achievement Medal"; people still search the old name.
const formerName = (a) => { const m = (a.aka || '').match(/Air Force [A-Z][A-Za-z ]+?(Medal|Award|Ribbon)/); return m && m[0] !== a.name ? m[0] : null; };
const acronym = (a) => { const t = (a.aka || '').split(' ')[0]; return /^[A-Z][A-Z0-9-]{1,7}$/.test(t) ? t : null; };
const clip = (s, n) => s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';

AWARDS.forEach((a, i) => { a.slug = slug(a.name); a.rank = i + 1; });

// ── Shared bits ──────────────────────────────────────
const ICONS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <symbol id="i-ext" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></symbol>
    <symbol id="i-left" viewBox="0 0 24 24"><path d="M19 12H5M11 18l-6-6 6-6"/></symbol>
    <symbol id="i-right" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
    <symbol id="i-chev-r" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></symbol>
    <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></symbol>
  </svg>`;
const icon = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const ANALYTICS = `<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "03a89f35132a4e8aa86bf1ed1b60541a"}'></script><!-- End Cloudflare Web Analytics -->`;
// Same encoded feedback address as the tool page; decoded only on click so scrapers don't find it.
const FEEDBACK_JS = `<script>
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-feedback]'); if (!b) return;
      var addr = Array.prototype.map.call(atob('enh0OXt+dnpwVyVyfnlgeGV1ZXJjcmc='), function (c) { return String.fromCharCode(c.charCodeAt(0) ^ 23); }).reverse().join('');
      window.open('mailto:' + addr + '?subject=' + encodeURIComponent(b.getAttribute('data-feedback') + ' (Air Force Decorations tool)'), '_blank', 'noopener');
    });
  </script>`;

function officialHtml(a) {
  return a.official.map((s) => {
    let body = '', inList = false;
    s.p.forEach((p) => {
      if (p.startsWith('• ')) { if (!inList) { body += '<ul>'; inList = true; } body += `<li>${esc(p.slice(2))}</li>`; }
      else { if (inList) { body += '</ul>'; inList = false; } body += `<p>${esc(p)}</p>`; }
    });
    if (inList) body += '</ul>';
    return (s.h ? `<h3>${esc(s.h.charAt(0) + s.h.slice(1).toLowerCase())}</h3>` : '') + body;
  }).join('\n');
}

// ── Award page ───────────────────────────────────────
function awardPage(a, i) {
  const prev = AWARDS[i - 1], next = AWARDS[i + 1];
  const former = formerName(a), acr = acronym(a);
  const url = BASE + a.slug + '/';
  const title = `${a.name}${acr ? ` (${acr})` : ''}: Eligibility and Criteria`;
  const desc = clip(`${a.summary} ${former ? `Formerly the ${former}. ` : ''}See who qualifies, how it's awarded, authorized devices, and the full AFPC criteria.`, 158);
  const related = AWARDS.filter((b) => b.cat === a.cat && b !== a).slice(0, 8);
  const qualifyLabel = a.basis === 'decoration' ? 'It belongs on your record if' : 'You qualify if any of these apply';
  const devs = Object.keys(a.devices || {});

  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'peterbrown.space', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Air Force Decorations and Ribbons', item: BASE },
      { '@type': 'ListItem', position: 3, name: a.name, item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'WebPage', name: title, url, description: desc, inLanguage: 'en',
      isPartOf: { '@type': 'WebSite', name: 'peterbrown.space', url: SITE + '/' },
      about: { '@type': 'Thing', name: a.name, alternateName: [former, acr].filter(Boolean), sameAs: a.url },
      primaryImageOfPage: BASE + a.img, dateModified: TODAY },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="peterbrown.space">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${BASE}og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${BASE}og.png">
  <link rel="icon" type="image/png" href="/evolveIcon.png">
  <link rel="stylesheet" href="../award.css">
  ${ANALYTICS}
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
  ${ICONS}
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="../">${icon('left')}Air Force Decorations and Ribbons</a><span>/</span><span>${esc(CATS[a.cat])}</span></nav>

    <header class="hero">
      <img class="ribbon" src="../${esc(a.img)}" alt="${esc(a.name)} ribbon" width="216" height="59">
      <div>
        <h1>${esc(a.name)}</h1>
        <p class="sub"><span class="kind">${KIND[a.basis]}</span>${former ? `Formerly the ${esc(former)}` : ''}${former && acr ? ' · ' : ''}${acr ? esc(acr) : ''}</p>
      </div>
    </header>
    <p class="lead">${esc(a.summary)}</p>

    <a class="cta" href="../#a-${a.id}">Check your eligibility and build your ribbon rack${icon('right')}</a>

    <section>
      <h2>How you get it</h2>
      <p>${esc(a.how)}</p>
      ${a.approval ? `<p><b>Approval:</b> ${esc(a.approval)}.</p>` : ''}
    </section>

    <section>
      <h2>${qualifyLabel}</h2>
      <ul class="checks">${a.criteria.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </section>

    ${a.awardedFor && a.awardedFor.length ? `<section>
      <h2>What it's awarded for</h2>
      <ul>${a.awardedFor.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </section>` : ''}

    ${devs.length ? `<section>
      <h2>Devices</h2>
      <ul>${devs.map((k) => `<li><b>${DEVICE_NAMES[k]}:</b> ${esc(a.devices[k].charAt(0).toUpperCase() + a.devices[k].slice(1))}</li>`).join('')}</ul>
    </section>` : ''}

    <section>
      <h2>Quick facts</h2>
      <dl class="facts">
        <dt>Category</dt><dd>${esc(CATS[a.cat])}</dd>
        <dt>Type</dt><dd>${KIND[a.basis]}</dd>
        ${a.authorizedDevices ? `<dt>Authorized devices</dt><dd>${esc(a.authorizedDevices)}</dd>` : ''}
        ${a.waps != null ? `<dt>WAPS points</dt><dd>${a.waps}</dd>` : ''}
        <dt>Position in the AFPC listing</dt><dd>${a.rank} of ${AWARDS.length} (listed in order of precedence)</dd>
      </dl>
    </section>

    <section>
      <details class="official">
        <summary>${icon('chev-r')}Full AFPC fact sheet text</summary>
        <div class="official-body">${officialHtml(a)}</div>
      </details>
      <p class="source">Source: <a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.name)} fact sheet, Air Force's Personnel Center${icon('ext')}</a></p>
    </section>

    <nav class="pager" aria-label="Order of precedence">
      ${prev ? `<a href="../${prev.slug}/">${icon('left')}<span><small>Higher precedence</small>${esc(prev.name)}</span></a>` : '<span></span>'}
      ${next ? `<a class="next" href="../${next.slug}/"><span><small>Lower precedence</small>${esc(next.name)}</span>${icon('right')}</a>` : '<span></span>'}
    </nav>

    ${related.length ? `<section>
      <h2>More ${esc(CATS[a.cat].toLowerCase())}</h2>
      <ul class="related">${related.map((b) => `<li><a href="../${b.slug}/"><img src="../${esc(b.img)}" alt="" width="54" height="15" loading="lazy">${esc(b.name)}</a></li>`).join('')}</ul>
    </section>` : ''}

    <footer>
      <p>Summarized from the Air Force's Personnel Center <a href="https://www.afpc.af.mil/Career-Management/Decorations-and-Ribbons/" target="_blank" rel="noopener noreferrer">Decorations and Ribbons</a> fact sheets. This is an unofficial tool and doesn't verify entitlement. Your DD-214, personnel records, and AFPC make the final call.</p>
      <p><button class="feedback" data-feedback="Error report: ${esc(a.name)}">${icon('mail')}Report an error on this page</button></p>
    </footer>
  </div>
  ${FEEDBACK_JS}
</body>
</html>
`;
}

// ── Index section and structured data for the tool page ──
function indexSection() {
  const groups = Object.entries(CATS).map(([k, label]) => {
    const items = AWARDS.filter((a) => a.cat === k);
    return `<div class="idx-group"><h3>${esc(label)}</h3><ul>${items.map((a) => `<li><a href="${a.slug}/">${esc(a.name)}</a></li>`).join('')}</ul></div>`;
  }).join('\n      ');
  return `<section class="award-index" aria-labelledby="idxTitle">
      <h2 id="idxTitle">All Air Force decorations and ribbons</h2>
      <p>Each page covers who qualifies, how the award is approved, authorized devices, and the full AFPC fact sheet text. Awards are listed in order of precedence.</p>
      ${groups}
    </section>`;
}
function toolLd() {
  return JSON.stringify([
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Air Force Decorations and Ribbons', url: BASE,
      description: 'Check eligibility for every Air Force decoration and ribbon listed by AFPC, and build your ribbon rack, including from a photo or screenshot of your rack.',
      applicationCategory: 'ReferenceApplication', operatingSystem: 'Any', inLanguage: 'en', isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Air Force decorations and ribbons in order of precedence',
      numberOfItems: AWARDS.length,
      itemListElement: AWARDS.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.name, url: BASE + a.slug + '/' })) },
  ]);
}
function replaceBetween(src, tag, content) {
  const re = new RegExp(`(<!-- ${tag}:START -->)[\\s\\S]*?(<!-- ${tag}:END -->)`);
  if (!re.test(src)) throw new Error('Missing marker ' + tag);
  return src.replace(re, `$1\n    ${content}\n    $2`);
}

// ── Sitemap ──────────────────────────────────────────
// Other public pages on the site. Add new projects here.
const OTHER_PAGES = ['/', '/evolvesvg/', '/evolvesvg/about', '/storybound/', '/storybound/about', '/sudoku/', '/kenken/', '/timezone-converter'];
function sitemap() {
  const urls = [
    ...OTHER_PAGES.map((p) => ({ loc: SITE + p })),
    { loc: BASE, lastmod: TODAY },
    ...AWARDS.map((a) => ({ loc: BASE + a.slug + '/', lastmod: TODAY })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
}

// ── Write everything ─────────────────────────────────
const slugs = new Set();
AWARDS.forEach((a, i) => {
  if (slugs.has(a.slug)) throw new Error('Duplicate slug ' + a.slug);
  slugs.add(a.slug);
  const dir = path.join(DIR, a.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), awardPage(a, i));
});
// Remove pages for awards that no longer exist
for (const d of fs.readdirSync(DIR, { withFileTypes: true })) {
  if (d.isDirectory() && !slugs.has(d.name) && fs.existsSync(path.join(DIR, d.name, 'index.html')) && !['ribbons', 'tools'].includes(d.name)) {
    const html = fs.readFileSync(path.join(DIR, d.name, 'index.html'), 'utf8');
    if (html.includes('../award.css')) fs.rmSync(path.join(DIR, d.name), { recursive: true });
  }
}
let page = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
page = replaceBetween(page, 'AWARD-INDEX', indexSection());
page = replaceBetween(page, 'TOOL-LD', `<script type="application/ld+json">${toolLd()}</script>`);
page = page.replace(/const SLUGS = \{[^\n]*\};/, `const SLUGS = ${JSON.stringify(Object.fromEntries(AWARDS.map((a) => [a.id, a.slug])))};`);
fs.writeFileSync(path.join(DIR, 'index.html'), page);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap());
console.log(`Wrote ${AWARDS.length} award pages, updated index.html, and sitemap.xml (${OTHER_PAGES.length + 1 + AWARDS.length} URLs).`);
