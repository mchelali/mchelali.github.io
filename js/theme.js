// Light theme by default; the visitor's choice is remembered.
(function () {
  const root = document.documentElement;
  let theme = "light";

  try {
    if (localStorage.getItem("theme") === "dark") theme = "dark";
  } catch (error) {}

  root.setAttribute("data-theme", theme);

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector(".theme-toggle");
    if (!button) return;

    const update = () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      button.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
      button.setAttribute("aria-pressed", String(isDark));
    };

    update();
    button.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (error) {}
      update();
    });
  });
})();
