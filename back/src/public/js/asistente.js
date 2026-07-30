import { GoogleGenAI, Modality } from "https://esm.run/@google/genai@2.15.0";

const MODEL = "gemini-3.1-flash-live-preview";

const btnMic = document.getElementById("btnMic");
const estadoEl = document.getElementById("estadoAsistente");
const chatEl = document.getElementById("chat");
const formTexto = document.getElementById("formTexto");
const inputTexto = document.getElementById("inputTexto");
const inputImagen = document.getElementById("inputImagen");

let session = null;
let sesionConectando = null;
let audioContext = null;
let procesador = null;
let micStream = null;
let reproduccionCtx = null;
let colaReproduccion = Promise.resolve();
let activo = false;
let bufferEntrada = "";
let bufferSalida = "";

function estado(texto) {
  estadoEl.textContent = texto;
}

function agregarBurbuja(texto, quien, extraNode) {
  const div = document.createElement("div");
  div.style.alignSelf = quien === "sol" ? "flex-end" : "flex-start";
  div.style.background = quien === "sol" ? "var(--color-primary)" : "var(--color-surface)";
  div.style.color = quien === "sol" ? "#fff" : "inherit";
  div.style.padding = "8px 12px";
  div.style.borderRadius = "12px";
  div.style.maxWidth = "80%";
  if (texto) {
    const p = document.createElement("p");
    p.style.margin = "0";
    p.textContent = texto;
    div.appendChild(p);
  }
  if (extraNode) div.appendChild(extraNode);
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return div;
}

function archivoABase64Jpeg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const escala = MAX / Math.max(width, height);
        width = Math.round(width * escala);
        height = Math.round(height * escala);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      resolve({ base64: dataUrl.split(",")[1], previewUrl: dataUrl });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

function base64ToInt16(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

function int16ToBase64(int16) {
  const bytes = new Uint8Array(int16.buffer);
  let binario = "";
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
  return btoa(binario);
}

function float32AInt16(float32) {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

async function reproducirAudio(base64PCM24k) {
  if (!reproduccionCtx) {
    reproduccionCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
  }
  const int16 = base64ToInt16(base64PCM24k);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;

  const buffer = reproduccionCtx.createBuffer(1, float32.length, 24000);
  buffer.copyToChannel(float32, 0);

  colaReproduccion = colaReproduccion.then(
    () =>
      new Promise((resolve) => {
        const src = reproduccionCtx.createBufferSource();
        src.buffer = buffer;
        src.connect(reproduccionCtx.destination);
        src.onended = resolve;
        src.start();
      }),
  );
}

async function manejarToolCall(toolCall) {
  const functionResponses = [];
  for (const fc of toolCall.functionCalls) {
    let resultado;
    try {
      const res = await fetch("/asistente/ejecutar-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: fc.name, args: fc.args }),
      });
      resultado = await res.json();
    } catch (error) {
      resultado = { ok: false, mensaje: "Error de red ejecutando la herramienta." };
    }
    functionResponses.push({ name: fc.name, id: fc.id, response: resultado });
  }
  session.sendToolResponse({ functionResponses });
}

function flushTranscripciones(turnComplete) {
  if (!turnComplete) return;
  if (bufferEntrada.trim()) agregarBurbuja(bufferEntrada.trim(), "sol");
  if (bufferSalida.trim()) agregarBurbuja(bufferSalida.trim(), "asistente");
  bufferEntrada = "";
  bufferSalida = "";
}

function onMensaje(message) {
  if (message.toolCall) {
    manejarToolCall(message.toolCall);
  }

  const serverContent = message.serverContent;
  if (serverContent) {
    if (serverContent.inputTranscription && serverContent.inputTranscription.text) {
      bufferEntrada += serverContent.inputTranscription.text;
    }
    if (serverContent.outputTranscription && serverContent.outputTranscription.text) {
      bufferSalida += serverContent.outputTranscription.text;
    }

    const partes = serverContent.modelTurn && serverContent.modelTurn.parts;
    if (partes) {
      for (const parte of partes) {
        if (parte.inlineData && parte.inlineData.data) {
          reproducirAudio(parte.inlineData.data);
        }
      }
    }

    flushTranscripciones(serverContent.turnComplete);
  }
}

// Abre la sesión (si no hay una) sin tocar el micrófono, para que texto/imagen
// funcionen sin depender de que ya se haya activado "Hablar".
async function conectar() {
  if (session) return session;
  if (sesionConectando) return sesionConectando;

  sesionConectando = (async () => {
    estado("Conectando...");

    const tokenRes = await fetch("/asistente/token");
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      estado(tokenData.mensaje || "No se pudo conectar con el asistente.");
      throw new Error(tokenData.mensaje || "No se pudo conectar");
    }

    const ai = new GoogleGenAI({ apiKey: tokenData.token });

    session = await ai.live.connect({
      model: tokenData.model || MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => estado(activo ? "Escuchando..." : "Conectado. Tocá para hablar, o escribí/mandá una foto."),
        onerror: (e) => {
          estado("Error: " + e.message);
          detenerMic();
        },
        onclose: () => {
          estado("Desconectado.");
          detenerMic();
          session = null;
        },
        onmessage: onMensaje,
      },
    });

    return session;
  })();

  try {
    return await sesionConectando;
  } finally {
    sesionConectando = null;
  }
}

async function activarMic() {
  await conectar();

  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  const fuente = audioContext.createMediaStreamSource(micStream);

  procesador = audioContext.createScriptProcessor(4096, 1, 1);
  procesador.onaudioprocess = (event) => {
    if (!activo || !session) return;
    const datos = event.inputBuffer.getChannelData(0);
    const int16 = float32AInt16(datos);
    session.sendRealtimeInput({
      audio: { data: int16ToBase64(int16), mimeType: "audio/pcm;rate=16000" },
    });
  };
  fuente.connect(procesador);
  procesador.connect(audioContext.destination);

  activo = true;
  btnMic.textContent = "🛑 Detener";
  estado("Escuchando...");
}

function detenerMic() {
  activo = false;
  if (procesador) procesador.disconnect();
  if (micStream) micStream.getTracks().forEach((t) => t.stop());
  if (audioContext) audioContext.close();
  procesador = null;
  micStream = null;
  audioContext = null;
  btnMic.textContent = "🎙️ Hablar";
  estado("Tocá para empezar a hablar, o escribí/mandá una foto.");
}

btnMic.addEventListener("click", () => {
  if (activo) {
    detenerMic();
  } else {
    activarMic().catch((error) => {
      estado("No se pudo iniciar: " + error.message);
    });
  }
});

formTexto.addEventListener("submit", async (event) => {
  event.preventDefault();
  const texto = inputTexto.value.trim();
  if (!texto) return;

  inputTexto.value = "";
  agregarBurbuja(texto, "sol");

  try {
    const s = await conectar();
    s.sendRealtimeInput({ text: texto });
  } catch (error) {
    agregarBurbuja("No se pudo enviar: " + error.message, "asistente");
  }
});

inputImagen.addEventListener("change", async () => {
  const file = inputImagen.files[0];
  inputImagen.value = "";
  if (!file) return;

  try {
    const { base64, previewUrl } = await archivoABase64Jpeg(file);

    const img = document.createElement("img");
    img.src = previewUrl;
    img.style.maxWidth = "220px";
    img.style.borderRadius = "8px";
    img.style.display = "block";
    img.style.marginTop = "4px";
    agregarBurbuja("📷 Foto enviada", "sol", img);

    const s = await conectar();
    s.sendRealtimeInput({ video: { data: base64, mimeType: "image/jpeg" } });
  } catch (error) {
    agregarBurbuja("No se pudo enviar la imagen: " + error.message, "asistente");
  }
});
