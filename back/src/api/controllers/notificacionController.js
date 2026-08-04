const logger = require("../../utils/logger");
const notificacionModel = require("../models/notificacionModel");

const listarPropias = async (req, res) => {
  try {
    const idUsuario = req.session.user.id;
    const offset = parseInt(req.query.offset, 10) || 0;
    const [notificaciones, noLeidas] = await Promise.all([
      notificacionModel.getNotificacionesPorUsuario(idUsuario, 20, offset),
      notificacionModel.contarNoLeidas(idUsuario),
    ]);

    res.json({ ok: true, notificaciones, noLeidas });
  } catch (error) {
    logger.error("notificacion.listar.failed", { userId: req.session?.user?.id, error: error.message });
    res.status(500).json({ ok: false, notificaciones: [], noLeidas: 0 });
  }
};

const marcarLeidas = async (req, res) => {
  try {
    await notificacionModel.marcarTodasLeidas(req.session.user.id);
    res.json({ ok: true });
  } catch (error) {
    logger.error("notificacion.marcarLeidas.failed", { userId: req.session?.user?.id, error: error.message });
    res.status(500).json({ ok: false });
  }
};

module.exports = { listarPropias, marcarLeidas };
