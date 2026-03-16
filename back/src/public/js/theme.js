(function () {
  document.addEventListener("DOMContentLoaded", () => {
    // --- DARK MODE ---
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.body.classList.add("dark");

    const darkBtn = document.getElementById("darkToggle");
    if (darkBtn) {
      const updateDark = () => {
        darkBtn.textContent = document.body.classList.contains("dark")
          ? "☀️"
          : "🌙";
      };
      updateDark();
      darkBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        localStorage.setItem(
          "theme",
          document.body.classList.contains("dark") ? "dark" : "light",
        );
        updateDark();
      });
    }

    // --- SIDEBAR MOBILE ---
    const menuBtn = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (menuBtn && sidebar && overlay) {
      const openMenu = () => {
        sidebar.classList.add("open");
        overlay.classList.add("active");
      };

      const closeMenu = () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("active");
      };

      menuBtn.addEventListener("click", openMenu);
      overlay.addEventListener("click", closeMenu);

      // Cerrar al tocar un link del menú
      sidebar.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
      });
    }
  });
})();
