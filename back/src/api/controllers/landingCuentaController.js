const { OAuth2Client } = require("google-auth-library");
const logger = require("../../utils/logger");
const landingCuentaModel = require("../models/landingCuentaModel");
const fidelidadModel = require("../models/fidelidadModel");
const turnoModel = require("../models/turnoModel");
const fidelidadHelper = require("../../utils/fidelidadHelper");

const client = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

const TOKEN_DURACION_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

const emitirSesion = async (cuenta) => {
  const token = fidelidadHelper.generarTokenSesion();
  const expiraAt = new Date(Date.now() + TOKEN_DURACION_MS);
  await landingCuentaModel.guardarTokenSesion(cuenta.id, token, expiraAt);
  return token;
};

const loginGoogle = async (req, res) => {
  if (!client) {
    return res.status(503).json({ ok: false, mensaje: "El login con Google todavía no está configurado." });
  }

  try {
    const { id_token } = req.body;
    if (!id_token) {
      return res.status(400).json({ ok: false, mensaje: "Falta id_token." });
    }

    const ticket = await client.verifyIdToken({ idToken: id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    let cuenta = await landingCuentaModel.buscarPorGoogleSub(payload.sub);
    if (!cuenta) {
      cuenta = await landingCuentaModel.crearCuenta({
        googleSub: payload.sub,
        email: payload.email,
        nombreGoogle: payload.name || null,
      });
    }

    const token = await emitirSesion(cuenta);

    if (cuenta.estado_vinculacion === "pendiente" && !cuenta.telefono_ingresado) {
      return res.status(200).json({ ok: true, token, requiere_telefono: true });
    }

    return res.status(200).json({
      ok: true,
      token,
      requiere_telefono: false,
      estado_vinculacion: cuenta.estado_vinculacion,
    });
  } catch (error) {
    logger.error("fidelidad.loginGoogle.failed", { error: error.message });
    return res.status(401).json({ ok: false, mensaje: "No se pudo verificar el login de Google." });
  }
};

const ingresarTelefono = async (req, res) => {
  try {
    const { telefono } = req.body;
    if (!telefono) {
      return res.status(400).json({ ok: false, mensaje: "Falta el teléfono." });
    }

    const cuenta = req.cuenta;
    const resultado = await fidelidadHelper.resolverVinculacion(telefono, cuenta.nombre_google);

    const actualizada = await landingCuentaModel.actualizarVinculacion(cuenta.id, {
      telefonoIngresado: telefono,
      idCliente: resultado.idCliente || null,
      estadoVinculacion: resultado.estado,
    });

    return res.status(200).json({
      ok: true,
      estado_vinculacion: actualizada.estado_vinculacion,
    });
  } catch (error) {
    logger.error("fidelidad.ingresarTelefono.failed", { error: error.message });
    return res.status(500).json({ ok: false, mensaje: "No se pudo procesar el teléfono." });
  }
};

const verProgreso = async (req, res) => {
  try {
    const cuenta = req.cuenta;
    const ciclo = await fidelidadModel.getCicloActual(cuenta.id);
    const sellosDelCiclo = await fidelidadModel.contarSellosDelCiclo(cuenta.id, ciclo);
    const { premios } = await fidelidadModel.getSellosYPremiosDeCuenta(cuenta.id);

    return res.status(200).json({
      ok: true,
      estado_vinculacion: cuenta.estado_vinculacion,
      requiere_telefono: !cuenta.telefono_ingresado,
      ciclo_actual: ciclo,
      sellos_del_ciclo: sellosDelCiclo,
      total_sellos_por_ciclo: fidelidadHelper.TOTAL_SELLOS_POR_CICLO,
      premios,
    });
  } catch (error) {
    logger.error("fidelidad.verProgreso.failed", { error: error.message });
    return res.status(500).json({ ok: false, mensaje: "No se pudo obtener el progreso." });
  }
};

const girarRuleta = async (req, res) => {
  try {
    const cuenta = req.cuenta;
    const { id } = req.params;

    const premio = await fidelidadModel.getPremioPorIdYCuenta(id, cuenta.id);
    if (!premio) {
      return res.status(404).json({ ok: false, mensaje: "Premio no encontrado." });
    }

    if (premio.tipo_premio) {
      return res.status(200).json({ ok: true, premio, ya_girado: true });
    }

    const sorteado = fidelidadHelper.sortearPremio();
    const actualizado = await fidelidadModel.asignarResultadoPremio(id, sorteado.tipo, sorteado.descripcion);

    return res.status(200).json({ ok: true, premio: actualizado, ya_girado: false });
  } catch (error) {
    logger.error("fidelidad.girarRuleta.failed", { error: error.message });
    return res.status(500).json({ ok: false, mensaje: "No se pudo girar la ruleta." });
  }
};

const verHistorial = async (req, res) => {
  try {
    const cuenta = req.cuenta;
    if (!cuenta.id_cliente) {
      return res.status(200).json({ ok: true, turnos: [] });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;

    const turnos = await turnoModel.getHistorialParaClienta(cuenta.id_cliente, limit, offset);

    return res.status(200).json({
      ok: true,
      turnos: turnos.map((t) => ({
        fecha: t.fecha,
        hora: t.hora,
        estado: t.estado,
        servicio: t.servicio_descripcion,
        empleada: t.empleado_nombre,
      })),
    });
  } catch (error) {
    logger.error("fidelidad.verHistorial.failed", { error: error.message });
    return res.status(500).json({ ok: false, mensaje: "No se pudo obtener el historial." });
  }
};

module.exports = { loginGoogle, ingresarTelefono, verProgreso, girarRuleta, verHistorial };
