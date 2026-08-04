(function () {
  const LIMITE_PAGINA = 20;
  let offsetActual = 0;

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

  function renderizarItem(n) {
    return `
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
    `;
  }

  function actualizarBotonCargarMas(cantidadRecibida) {
    const btnCargarMas = document.getElementById("btn-cargar-mas-notificaciones");
    if (!btnCargarMas) return;
    btnCargarMas.style.display = cantidadRecibida === LIMITE_PAGINA ? "block" : "none";
  }

  function renderizar(notificaciones, noLeidas, append) {
    const lista = document.getElementById("mis-notificaciones-lista");
    if (!lista) return;

    window.notifCounts.mias = noLeidas;
    window.actualizarBadgeNotificaciones();

    if (!append) {
      if (notificaciones.length === 0) {
        lista.innerHTML = '<div class="alertas-vacio">Sin notificaciones</div>';
        return;
      }
      lista.innerHTML = notificaciones.map(renderizarItem).join("");
      return;
    }

    if (notificaciones.length > 0) {
      lista.insertAdjacentHTML("beforeend", notificaciones.map(renderizarItem).join(""));
    }
  }

  async function cargarNotificaciones(append = false) {
    if (!append) offsetActual = 0;

    try {
      const res = await fetch(`/notificaciones/mias?offset=${offsetActual}`);
      const data = await res.json();
      const notificaciones = data.notificaciones || [];
      renderizar(notificaciones, data.noLeidas || 0, append);
      actualizarBotonCargarMas(notificaciones.length);
      offsetActual += notificaciones.length;
    } catch (error) {
      // silencioso: si falla, la campanita simplemente no muestra nada
    }
  }

  async function marcarLeidas() {
    try {
      await fetch("/notificaciones/mias/marcar-leidas", { method: "POST" });
      window.notifCounts.mias = 0;
      window.actualizarBadgeNotificaciones();
    } catch (error) {
      // silencioso
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const btnCargarMas = document.getElementById("btn-cargar-mas-notificaciones");

    cargarNotificaciones();

    if (btnCargarMas) {
      btnCargarMas.addEventListener("click", function (e) {
        e.stopPropagation();
        cargarNotificaciones(true);
      });
    }
  });

  document.addEventListener("notificaciones:abiertas", marcarLeidas);
})();
