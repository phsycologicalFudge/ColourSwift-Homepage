const sidebarLinks = document.querySelectorAll(".docs-sidebar a");
const sections = document.querySelectorAll(".doc-section");

function showSection(id) {
  sections.forEach((section) => {
    section.classList.toggle("active", section.id === id);
  });
  sidebarLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.section === id);
  });
  history.replaceState(null, "", `#${id}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

sidebarLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    showSection(link.dataset.section);
  });
});

document.querySelectorAll(".nav-btn[data-next]").forEach((btn) => {
  btn.addEventListener("click", () => showSection(btn.dataset.next));
});

document.querySelectorAll(".nav-btn[data-prev]").forEach((btn) => {
  btn.addEventListener("click", () => showSection(btn.dataset.prev));
});

const hash = window.location.hash.replace("#", "");
if (hash) showSection(hash);

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("header nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => nav.classList.toggle("active"));
}
