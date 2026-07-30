(function () {
  function tiempoRelativo(fechaISO) {
    const diffMs = Date.now() - new Date(fechaISO).getTime();
    const minutos = Math.floor(diffMs / 60000);
    if (minutos < 1) return "recién";
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} hs`;
    const dias = Math.floor(horas / 24);
    return `hace ${dias} d`;
  }

  function renderizar(notificaciones, noLeidas) {
    const lista = document.getElementById("mis-notificaciones-lista");
    const badge = document.getElementById("mis-notificaciones-badge");
    if (!lista || !badge) return;

    if (noLeidas > 0) {
      badge.textContent = noLeidas;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }

    if (notificaciones.length === 0) {
      lista.innerHTML = '<div class="alertas-vacio">Sin notificaciones</div>';
      return;
    }

    lista.innerHTML = notificaciones
      .map(
        (n) => `
      <div class="alerta-item">
        <span class="alerta-icono">🔔</span>
        <div class="alerta-contenido">
          ${
            n.url
              ? `<a href="${n.url}" class="alerta-mensaje" style="color: var(--color-text); text-decoration: none; font-weight: 600;">${n.titulo}</a>`
              : `<span class="alerta-mensaje" style="font-weight: 600;">${n.titulo}</span>`
          }
          ${n.cuerpo ? `<div class="alerta-mensaje" style="font-weight: 400;">${n.cuerpo}</div>` : ""}
          <span class="alerta-link" style="cursor: default;">${tiempoRelativo(n.created_at)}</span>
        </div>
      </div>
    `,
      )
      .join("");
  }

  async function cargarNotificaciones() {
    try {
      const res = await fetch("/notificaciones/mias");
      const data = await res.json();
      renderizar(data.notificaciones || [], data.noLeidas || 0);
    } catch (error) {
      // silencioso: si falla, la campanita simplemente no muestra nada
    }
  }

  async function marcarLeidas() {
    try {
      await fetch("/notificaciones/mias/marcar-leidas", { method: "POST" });
      const badge = document.getElementById("mis-notificaciones-badge");
      if (badge) badge.style.display = "none";
    } catch (error) {
      // silencioso
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("mis-notificaciones-btn");
    const dropdown = document.getElementById("mis-notificaciones-dropdown");
    if (!btn || !dropdown) return;

    cargarNotificaciones();

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const abriendo = !dropdown.classList.contains("open");
      dropdown.classList.toggle("open");
      if (abriendo) marcarLeidas();
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest("#mis-notificaciones-wrapper")) {
        dropdown.classList.remove("open");
      }
    });
  });
})();
