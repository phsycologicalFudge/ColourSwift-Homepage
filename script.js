(function () {
  function isExternal(href) {
    // absolute URL (http/https/etc) OR mailto OR hash
    return /^([a-z]+:)?\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('#');
  }

  function filename(path) {
    const f = path.split('/').pop();
    return f === '' ? 'index.html' : f;
  }

  function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.remove('hidden');
  }

  function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  }

  // Hide after load
  window.addEventListener('load', function () {
    // small tick so you can actually see it flash if needed
    setTimeout(hideLoader, 50);
  });

  // Handle bfcache (back/forward navigation)
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) hideLoader();
  });

  document.querySelector('.menu-toggle').addEventListener('click', () => {
  document.querySelector('header nav').classList.toggle('active');
});

  // Intercept internal link clicks (event delegation)
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a');
    if (!a) return;

    const href = a.getAttribute('href');
    if (!href || isExternal(href)) return;

    const current = filename(window.location.pathname);
    const target  = filename(href);

    // same-page link: do nothing
    if (current === target) return;

    e.preventDefault();
    showLoader();
    // brief delay so the user sees the transition
    setTimeout(function () {
      window.location.href = href;
    }, 200);
  });
})();
