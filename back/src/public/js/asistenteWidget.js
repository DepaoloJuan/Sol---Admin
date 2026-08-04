import { crearAsistenteChat } from "/js/asistenteCore.js";

const btnMic = document.getElementById("widget-btnMic");
const estadoEl = document.getElementById("widget-estadoAsistente");
const chatEl = document.getElementById("widget-chat");
const formTexto = document.getElementById("widget-formTexto");
const inputTexto = document.getElementById("widget-inputTexto");
const inputImagen = document.getElementById("widget-inputImagen");
const btnVaciar = document.getElementById("widget-btnVaciar");

if (btnMic && estadoEl && chatEl && formTexto && inputTexto && inputImagen) {
  crearAsistenteChat({
    btnMic,
    estadoEl,
    chatEl,
    formTexto,
    inputTexto,
    inputImagen,
    btnVaciar,
  });

  const burbuja = document.getElementById("asistente-burbuja");
  const panel = document.getElementById("asistente-panel");
  const cerrar = document.getElementById("asistente-cerrar");

  if (burbuja && panel) {
    burbuja.addEventListener("click", () => {
      panel.classList.toggle("open");
    });
  }

  if (cerrar && panel) {
    cerrar.addEventListener("click", () => {
      panel.classList.remove("open");
    });
  }
}
