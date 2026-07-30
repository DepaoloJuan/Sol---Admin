const logger = require("../../utils/logger");
const { guardarSuscripcion, eliminarSuscripcion, getSuscripcionesPorUsuario } = require("../models/pushSubscriptionModel");
const { enviarPushATodas } = require("../../utils/pushHelper");

const getPublicKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

const suscribir = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    await guardarSuscripcion(req.session.user.id, { endpoint, keys });
    res.status(201).json({ ok: true });
  } catch (error) {
    logger.error("push.subscribe.failed", { error: error.message });
    res.status(500).json({ ok: false });
  }
};

const desuscribir = async (req, res) => {
  try {
    const { endpoint } = req.body;
    await eliminarSuscripcion(endpoint);
    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error("push.unsubscribe.failed", { error: error.message });
    res.status(500).json({ ok: false });
  }
};

const enviarPrueba = async (req, res) => {
  try {
    const suscripciones = await getSuscripcionesPorUsuario(req.session.user.id);
    if (suscripciones.length === 0) {
      return res.status(404).json({ ok: false, mensaje: "No hay ninguna suscripción activa para este usuario." });
    }

    await enviarPushATodas(suscripciones, {
      title: "Notificación de prueba",
      body: "Si ves esto, el push está funcionando.",
      url: "/",
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error("push.test.failed", { error: error.message });
    res.status(500).json({ ok: false });
  }
};

module.exports = { getPublicKey, suscribir, desuscribir, enviarPrueba };
