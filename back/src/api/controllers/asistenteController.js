const logger = require("../../utils/logger");
const { TOOLS, SYSTEM_INSTRUCTION, ejecutarTool } = require("../../utils/geminiTools");
const asistenteMensajeModel = require("../models/asistenteMensajeModel");

let genAI = null;
if (process.env.GEMINI_API_KEY) {
  const { GoogleGenAI } = require("@google/genai");
  genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} else {
  logger.warn("asistente.gemini.no_configurado");
}

const MODEL = "gemini-3.1-flash-live-preview";

const crearTokenEfimero = async (req, res) => {
  if (!genAI) {
    return res.status(503).json({ ok: false, mensaje: "El asistente de voz todavía no está configurado (falta GEMINI_API_KEY)." });
  }

  try {
    const token = await genAI.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: MODEL,
          config: {
            responseModalities: ["AUDIO"],
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: TOOLS,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
      },
    });

    res.status(200).json({ token: token.name, model: MODEL });
  } catch (error) {
    logger.error("asistente.token.failed", { error: error.message });
    res.status(500).json({ ok: false, mensaje: "No se pudo generar el token del asistente." });
  }
};

const ejecutarToolHttp = async (req, res) => {
  try {
    const { nombre, args } = req.body;
    const resultado = await ejecutarTool(nombre, args || {});
    res.status(200).json(resultado);
  } catch (error) {
    logger.error("asistente.tool.failed", { error: error.message });
    res.status(500).json({ ok: false, mensaje: "Error ejecutando la herramienta." });
  }
};

const getHistorial = async (req, res) => {
  try {
    const mensajes = await asistenteMensajeModel.getUltimosMensajes(req.session.user.id);
    res.status(200).json({ ok: true, mensajes: mensajes.map((m) => ({ rol: m.rol, texto: m.texto })) });
  } catch (error) {
    logger.error("asistente.historial.get.failed", { error: error.message });
    res.status(500).json({ ok: false, mensajes: [] });
  }
};

const guardarTurno = async (req, res) => {
  try {
    const { rol, texto } = req.body;
    if (!rol || !texto || !["sol", "asistente"].includes(rol)) {
      return res.status(400).json({ ok: false, mensaje: "Datos inválidos." });
    }
    await asistenteMensajeModel.guardarMensaje(req.session.user.id, rol, texto);
    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error("asistente.historial.guardar.failed", { error: error.message });
    res.status(500).json({ ok: false });
  }
};

const vaciarHistorial = async (req, res) => {
  try {
    await asistenteMensajeModel.vaciarMensajes(req.session.user.id);
    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error("asistente.historial.vaciar.failed", { error: error.message });
    res.status(500).json({ ok: false });
  }
};

module.exports = { crearTokenEfimero, ejecutarToolHttp, getHistorial, guardarTurno, vaciarHistorial };
