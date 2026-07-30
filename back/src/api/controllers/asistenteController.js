const logger = require("../../utils/logger");
const { TOOLS, SYSTEM_INSTRUCTION, ejecutarTool } = require("../../utils/geminiTools");

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

module.exports = { crearTokenEfimero, ejecutarToolHttp };
