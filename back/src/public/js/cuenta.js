(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("cuenta-btn");
    const dropdown = document.getElementById("cuenta-dropdown");
    if (!btn || !dropdown) return;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest("#cuenta-wrapper")) {
        dropdown.classList.remove("open");
      }
    });
  });
})();
