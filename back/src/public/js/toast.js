(function () {
  function crearContenedor() {
    let contenedor = document.getElementById("toast-contenedor");
    if (!contenedor) {
      contenedor = document.createElement("div");
      contenedor.id = "toast-contenedor";
      document.body.appendChild(contenedor);
    }
    return contenedor;
  }

  window.showToast = function (mensaje, tipo, duracion) {
    tipo = tipo || "info";
    duracion = duracion !== undefined ? duracion : 4000;

    const contenedor = crearContenedor();

    const toast = document.createElement("div");
    toast.className = "toast toast-" + tipo;

    const iconos = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
    const icono = iconos[tipo] || iconos.info;

    toast.innerHTML =
      '<span class="toast-icono">' +
      icono +
      "</span>" +
      '<span class="toast-mensaje">' +
      mensaje +
      "</span>" +
      '<button class="toast-cerrar" onclick="this.parentElement.remove()">✕</button>';

    contenedor.appendChild(toast);

    // Forzar reflow para que la animación de entrada funcione
    toast.offsetHeight;
    toast.classList.add("toast-visible");

    if (duracion > 0) {
      setTimeout(function () {
        toast.classList.remove("toast-visible");
        toast.classList.add("toast-saliendo");
        setTimeout(function () {
          toast.remove();
        }, 300);
      }, duracion);
    }
  };

  window.showConfirm = function (mensaje, onAceptar) {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;";

    overlay.innerHTML =
      '<div class="confirm-box">' +
        '<p class="confirm-mensaje">' + mensaje + "</p>" +
        '<div class="confirm-botones">' +
          '<button class="btn btn-danger confirm-aceptar">Eliminar</button>' +
          '<button class="btn btn-secondary confirm-cancelar">Cancelar</button>' +
        "</div>" +
      "</div>";

    document.body.appendChild(overlay);

    overlay.querySelector(".confirm-aceptar").addEventListener("click", function () {
      overlay.remove();
      onAceptar();
    });

    overlay.querySelector(".confirm-cancelar").addEventListener("click", function () {
      overlay.remove();
    });
  };
})();
