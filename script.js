(function () {
  function isExternal(href) {
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

  window.addEventListener('load', function () {
    setTimeout(hideLoader, 50);
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) hideLoader();
  });

  document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('header nav');

    if (menuToggle && nav) {
      menuToggle.addEventListener('click', function () {
        nav.classList.toggle('active');
      });
    }

    const success = document.getElementById('submissionSuccess');

    function wireForm(id) {
      const form = document.getElementById(id);
      if (!form) return;

      form.addEventListener('submit', function () {
        if (success) {
          success.hidden = false;
          window.scrollTo({ top: success.offsetTop, behavior: 'smooth' });
        }
        setTimeout(function () {
          form.reset();
        }, 300);
      });
    }

    wireForm('whitelistForm');
    wireForm('malwareForm');

    document.querySelectorAll('.faq-question').forEach(function (button) {
      button.addEventListener('click', function () {
        const item = button.parentElement;
        const allItems = document.querySelectorAll('.faq-item');

        allItems.forEach(function (i) {
          if (i !== item) i.classList.remove('active');
        });

        item.classList.toggle('active');
      });
    });
  });

  document.addEventListener('click', function (e) {
    const a = e.target.closest('a');
    if (!a) return;

    const href = a.getAttribute('href');
    if (!href || isExternal(href)) return;

    const current = filename(window.location.pathname);
    const target = filename(href);

    if (current === target) return;

    e.preventDefault();
    showLoader();
    setTimeout(function () {
      window.location.href = href;
    }, 200);
  });
})();
