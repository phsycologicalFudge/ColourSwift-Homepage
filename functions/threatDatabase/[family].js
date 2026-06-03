export async function onRequest(context) {
  const { params, env, request } = context;
  const slug = params.family;

  if (slug.includes('.')) return new Response('Not found', { status: 404 });

  // Read CSV from static assets — no D1 needed
  const assetRes = await env.ASSETS.fetch(
    new URL('/threatDatabase/families.csv', request.url)
  );

  if (!assetRes.ok) {
    return new Response('Could not load threat data', { status: 500 });
  }

  const csv = await assetRes.text();
  const family = parseCSV(csv).find(r => r.slug === slug);

  if (!family) {
    return new Response(renderNotFound(slug), {
      status: 404,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }

  return new Response(renderDetail(family), {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

// ── CSV parser (mirrors client-side version) ──────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = splitLine(lines[0]);
  return lines.slice(1)
    .map(line => {
      const vals = splitLine(line);
      const obj = {};
      headers.forEach((h, i) => obj[h.trim()] = (vals[i] || '').trim());
      return obj;
    })
    .filter(r => r.slug);
}

function splitLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

// ── HTML helpers ──────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shell(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="icon" type="image/svg+xml" href="/images/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/threatDatabase/style.css">
</head>
<body>
  <header>
    <div class="container">
      <div class="header-inner">
        <a href="/" class="brand-wordmark">ColourSwift</a>
        <div class="menu-toggle" aria-label="Toggle menu" onclick="document.getElementById('main-nav').classList.toggle('active')">
          <span></span><span></span><span></span>
        </div>
        <nav id="main-nav">
          <a href="/docs">Docs</a>
          <a href="/submissions">Submissions</a>
          <a href="https://api.colourswift.com/account">Account</a>
          <a href="https://github.com/phsycologicalFudge/ColourSwift_AV" class="nav-cta">Download</a>
        </nav>
      </div>
    </div>
  </header>
  <main>
    <div class="container">
      ${body}
    </div>
  </main>
  <footer>
    <div class="container">
      <div class="footer-inner">
        <div>&copy; 2026 ColourSwift Technologies</div>
        <div>
          <a href="https://api.colourswift.com/health">Status</a>
          <span> | </span>
          <a href="/Policies/Private-Policy">Privacy</a>
          <span> | </span>
          <a href="/Policies/Terms-Of-Use">Terms</a>
        </div>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function renderDetail(f) {
  const addedRow = f.added_date
    ? `<div class="meta-row"><span class="meta-label">Added</span><span>${esc(f.added_date)}</span></div>`
    : '';

  return shell(`${esc(f.display_name)} — Threat Database | ColourSwift`, `
    <div class="breadcrumb">
      <a href="/threatDatabase">Threat Database</a>
      <span>/</span>
      <span>${esc(f.display_name)}</span>
    </div>
    <div class="detail-header">
      <div class="detail-title-row">
        <h1>${esc(f.display_name)}</h1>
        <span class="detail-category">${esc(f.category)}</span>
      </div>
      <p class="detail-description">${esc(f.description)}</p>
    </div>
    <div class="detail-meta">
      <div class="meta-row">
        <span class="meta-label">Category</span>
        <span>${esc(f.category)}</span>
      </div>
      ${addedRow}
    </div>
    <div class="av-callout">
      <strong>AVarionX</strong> detects and removes this threat.
    </div>
  `);
}

function renderNotFound(slug) {
  return shell('Not found — Threat Database | ColourSwift', `
    <div class="breadcrumb">
      <a href="/threatDatabase">Threat Database</a>
      <span>/</span>
      <span>${esc(slug)}</span>
    </div>
    <div style="padding:48px 0;">
      <h1 style="font-family:var(--font-display);font-size:24px;font-weight:800;margin-bottom:12px;">Family not found</h1>
      <p style="color:var(--muted);font-size:15px;">No entry for <code style="font-size:13px;">${esc(slug)}</code> exists in the threat database.</p>
    </div>
  `);
}
