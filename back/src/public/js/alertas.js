(function () {
  const EXPIRACIONES = {
    cumple: 24 * 60 * 60 * 1000, // 24 horas
    deuda: 4 * 60 * 60 * 1000, // 4 horas
    "datos-incompletos": 24 * 60 * 60 * 1000, // 24 horas
    default: 4 * 60 * 60 * 1000, // 4 horas
  };

  const ICONOS = {
    warning: "⚠️",
    danger: "🔴",
    info: "ℹ️",
  };

  function getIgnoradas() {
    try {
      return JSON.parse(localStorage.getItem("alertas-ignoradas") || "{}");
    } catch {
      return {};
    }
  }

  function ignorarAlerta(id, tipo) {
    const ignoradas = getIgnoradas();
    const expiracion = EXPIRACIONES[tipo] || EXPIRACIONES["default"];
    ignoradas[id] = Date.now() + expiracion;
    localStorage.setItem("alertas-ignoradas", JSON.stringify(ignoradas));
  }

  function estaIgnorada(id) {
    const ignoradas = getIgnoradas();
    if (!ignoradas[id]) return false;
    if (Date.now() > ignoradas[id]) {
      delete ignoradas[id];
      localStorage.setItem("alertas-ignoradas", JSON.stringify(ignoradas));
      return false;
    }
    return true;
  }

  function renderizarAlertas(alertas) {
    const lista = document.getElementById("alertas-lista");
    if (!lista) return;

    const visibles = alertas.filter((a) => !estaIgnorada(a.id));

    if (visibles.length === 0) {
      lista.innerHTML =
        '<div class="alertas-vacio">Sin notificaciones 🎉</div>';
      window.notifCounts.alertas = visibles.length;
      window.actualizarBadgeNotificaciones();
      return;
    }

    window.notifCounts.alertas = visibles.length;
    window.actualizarBadgeNotificaciones();

    lista.innerHTML = visibles
      .map(
        (a) => `
      <div class="alerta-item alerta-item--${a.tipo}" id="alerta-${a.id}">
        <span class="alerta-icono">${ICONOS[a.tipo] || "ℹ️"}</span>
        <div class="alerta-contenido">
          ${
            a.link
              ? `<a href="${a.link}" class="alerta-mensaje" style="color: var(--color-text); text-decoration: none;">${a.mensaje}</a>`
              : `<span class="alerta-mensaje">${a.mensaje}</span>`
          }
          ${a.link ? `<a href="${a.link}" class="alerta-link">Ver →</a>` : ""}
        </div>
        <button class="alerta-cerrar" onclick="window.ignorarAlerta('${a.id}', '${a.tipoExpiracion || "default"}')" title="Ignorar">✕</button>
      </div>
    `,
      )
      .join("");
  }

  window.ignorarAlerta = function (id, tipoExpiracion) {
    ignorarAlerta(id, tipoExpiracion);
    const el = document.getElementById(`alerta-${id}`);
    if (el) el.remove();

    const lista = document.getElementById("alertas-lista");
    if (lista && lista.children.length === 0) {
      lista.innerHTML =
        '<div class="alertas-vacio">Sin notificaciones 🎉</div>';
    }

    const actual = (window.notifCounts.alertas || 0) - 1;
    window.notifCounts.alertas = actual < 0 ? 0 : actual;
    window.actualizarBadgeNotificaciones();
  };

  window.initAlertas = function (alertas) {
    renderizarAlertas(alertas);
  };
})();
