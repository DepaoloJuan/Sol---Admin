const webpush = require("web-push");
const logger = require("./logger");
const { eliminarSuscripcion } = require("../api/models/pushSubscriptionModel");
const { crearNotificacion } = require("../api/models/notificacionModel");

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
} else {
  logger.warn("push.vapid.no_configurado");
}

const enviarPush = async (suscripcion, payload) => {
  const pushSubscription = {
    endpoint: suscripcion.endpoint,
    keys: {
      p256dh: suscripcion.p256dh,
      auth: suscripcion.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      await eliminarSuscripcion(suscripcion.endpoint);
    } else {
      logger.error("push.envio.failed", { error: error.message });
    }
  }
};

const enviarPushATodas = async (suscripciones, payload) => {
  await Promise.all(suscripciones.map((s) => enviarPush(s, payload)));

  try {
    const idsUsuarios = [...new Set(suscripciones.map((s) => s.id_usuario).filter(Boolean))];
    await Promise.all(
      idsUsuarios.map((idUsuario) =>
        crearNotificacion(idUsuario, {
          titulo: payload.title,
          cuerpo: payload.body,
          url: payload.url,
        }),
      ),
    );
  } catch (error) {
    logger.error("push.notificacion.guardar.failed", { error: error.message });
  }
};

module.exports = { enviarPush, enviarPushATodas };
