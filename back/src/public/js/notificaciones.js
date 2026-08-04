(function () {
  window.notifCounts = { alertas: 0, mias: 0 };

  window.actualizarBadgeNotificaciones = function () {
    const badge = document.getElementById("notificaciones-badge");
    if (!badge) return;
    const total = (window.notifCounts.alertas || 0) + (window.notifCounts.mias || 0);
    if (total > 0) {
      badge.textContent = total;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("notificaciones-btn");
    const dropdown = document.getElementById("notificaciones-dropdown");
    if (!btn || !dropdown) return;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const abriendo = !dropdown.classList.contains("open");
      dropdown.classList.toggle("open");
      if (abriendo) document.dispatchEvent(new CustomEvent("notificaciones:abiertas"));
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest("#notificaciones-wrapper")) {
        dropdown.classList.remove("open");
      }
    });
  });
})();
