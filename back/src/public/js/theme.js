(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.body.classList.add("dark");

    const btn = document.getElementById("darkToggle");
    if (!btn) return;

    const update = () => {
      const isDark = document.body.classList.contains("dark");
      btn.textContent = isDark ? "☀️" : "🌙";
    };

    update();

    btn.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      localStorage.setItem(
        "theme",
        document.body.classList.contains("dark") ? "dark" : "light",
      );
      update();
    });
  });
})();
