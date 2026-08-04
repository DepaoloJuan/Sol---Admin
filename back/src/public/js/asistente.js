import { crearAsistenteChat } from "/js/asistenteCore.js";

const btnMic = document.getElementById("btnMic");
const estadoAsistente = document.getElementById("estadoAsistente");
const chat = document.getElementById("chat");
const formTexto = document.getElementById("formTexto");
const inputTexto = document.getElementById("inputTexto");
const inputImagen = document.getElementById("inputImagen");
const btnVaciarAsistente = document.getElementById("btnVaciarAsistente");

crearAsistenteChat({
  btnMic,
  estadoEl: estadoAsistente,
  chatEl: chat,
  formTexto,
  inputTexto,
  inputImagen,
  btnVaciar: btnVaciarAsistente,
});
