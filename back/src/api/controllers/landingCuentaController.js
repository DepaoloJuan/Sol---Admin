const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcrypt");
const logger = require("../../utils/logger");
const landingCuentaModel = require("../models/landingCuentaModel");
const fidelidadModel = require("../models/fidelidadModel");
const turnoModel = require("../models/turnoModel");
const fidelidadHelper = require("../../utils/fidelidadHelper");
const emailHelper = require("../../utils/emailHelper");

const client = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

const TOKEN_DURACION_MS = 1000 * 60 * 60 * 24 * 30; // 30 días
const RESET_DURACION_MS = 1000 * 60 * 60; // 1 hora
const PASSWORD_MIN_LARGO = 6;

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
        nombre: payload.name || null,
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

const registro = async (req, res) => {
  try {
    const { nombre, email, password, telefono } = req.body;
    if (!nombre || !email || !password || !telefono) {
      return res.status(400).json({ ok: false, mensaje: "Faltan datos." });
    }
    if (password.length < PASSWORD_MIN_LARGO) {
      return res.status(400).json({ ok: false, mensaje: `La contraseña tiene que tener al menos ${PASSWORD_MIN_LARGO} caracteres.` });
    }

    const existente = await landingCuentaModel.buscarPorEmail(email);
    if (existente) {
      return res.status(409).json({ ok: false, mensaje: "Ya existe una cuenta con ese email." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const cuenta = await landingCuentaModel.crearCuentaConPassword({ email, nombre, passwordHash });

    const resultado = await fidelidadHelper.resolverVinculacion(telefono, nombre);
    const actualizada = await landingCuentaModel.actualizarVinculacion(cuenta.id, {
      telefonoIngresado: telefono,
      idCliente: resultado.idCliente || null,
      estadoVinculacion: resultado.estado,
    });

    const token = await emitirSesion(actualizada);

    return res.status(200).json({
      ok: true,
      token,
      requiere_telefono: false,
      estado_vinculacion: actualizada.estado_vinculacion,
    });
  } catch (error) {
    logger.error("fidelidad.registro.failed", { error: error.message });
    return res.status(500).json({ ok: false, mensaje: "No se pudo crear la cuenta." });
  }
};

const loginEmail = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, mensaje: "Faltan datos." });
    }

    const cuenta = await landingCuentaModel.buscarPorEmail(email);
    if (!cuenta || !cuenta.password_hash) {
      if (cuenta && !cuenta.password_hash) {
        return res.status(400).json({ ok: false, mensaje: "Esta cuenta usa Google — iniciá sesión con ese botón." });
      }
      return res.status(401).json({ ok: false, mensaje: "Email o contraseña incorrectos." });
    }

    const coincide = await bcrypt.compare(password, cuenta.password_hash);
    if (!coincide) {
      return res.status(401).json({ ok: false, mensaje: "Email o contraseña incorrectos." });
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
    logger.error("fidelidad.loginEmail.failed", { error: error.message });
    return res.status(500).json({ ok: false, mensaje: "No se pudo iniciar sesión." });
  }
};

const MENSAJE_OLVIDE_GENERICO = "Si el email está registrado, te mandamos un link para restablecer la contraseña.";

const olvidePassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ ok: false, mensaje: "Falta el email." });
    }

    const cuenta = await landingCuentaModel.buscarPorEmail(email);
    if (cuenta && cuenta.password_hash) {
      const resetToken = fidelidadHelper.generarTokenSesion();
      const expiraAt = new Date(Date.now() + RESET_DURACION_MS);
      await landingCuentaModel.guardarResetToken(cuenta.id, resetToken, expiraAt);

      const frontendUrl = process.env.FRONTEND_URL || "https://www.solcantero.com.ar";
      const resetUrl = `${frontendUrl}/mi-fidelidad/resetear?token=${resetToken}`;
      await emailHelper.enviarEmailResetPassword(email, resetUrl);
    }

    // Respuesta genérica siempre, exista o no la cuenta — no se filtra qué emails están registrados.
    return res.status(200).json({ ok: true, mensaje: MENSAJE_OLVIDE_GENERICO });
  } catch (error) {
    logger.error("fidelidad.olvidePassword.failed", { error: error.message });
    return res.status(200).json({ ok: true, mensaje: MENSAJE_OLVIDE_GENERICO });
  }
};

const resetearPassword = async (req, res) => {
  try {
    const { token, password_nueva } = req.body;
    if (!token || !password_nueva) {
      return res.status(400).json({ ok: false, mensaje: "Faltan datos." });
    }
    if (password_nueva.length < PASSWORD_MIN_LARGO) {
      return res.status(400).json({ ok: false, mensaje: `La contraseña tiene que tener al menos ${PASSWORD_MIN_LARGO} caracteres.` });
    }

    const cuenta = await landingCuentaModel.buscarPorResetToken(token);
    if (!cuenta) {
      return res.status(400).json({ ok: false, mensaje: "El link venció o no es válido. Pedí uno nuevo." });
    }

    const passwordHash = await bcrypt.hash(password_nueva, 10);
    await landingCuentaModel.actualizarPassword(cuenta.id, passwordHash);

    return res.status(200).json({ ok: true, mensaje: "Contraseña actualizada. Ya podés iniciar sesión." });
  } catch (error) {
    logger.error("fidelidad.resetearPassword.failed", { error: error.message });
    return res.status(500).json({ ok: false, mensaje: "No se pudo actualizar la contraseña." });
  }
};

const ingresarTelefono = async (req, res) => {
  try {
    const { telefono } = req.body;
    if (!telefono) {
      return res.status(400).json({ ok: false, mensaje: "Falta el teléfono." });
    }

    const cuenta = req.cuenta;
    const resultado = await fidelidadHelper.resolverVinculacion(telefono, cuenta.nombre);

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
    const premios = await fidelidadModel.getPremiosDelCiclo(cuenta.id, ciclo);

    return res.status(200).json({
      ok: true,
      estado_vinculacion: cuenta.estado_vinculacion,
      requiere_telefono: !cuenta.telefono_ingresado,
      nombre: cuenta.nombre,
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

const verTarjetasAnteriores = async (req, res) => {
  try {
    const cuenta = req.cuenta;
    const cicloActual = await fidelidadModel.getCicloActual(cuenta.id);
    const tarjetas = await fidelidadModel.getTarjetasAnteriores(cuenta.id, cicloActual);

    return res.status(200).json({ ok: true, tarjetas });
  } catch (error) {
    logger.error("fidelidad.verTarjetasAnteriores.failed", { error: error.message });
    return res.status(500).json({ ok: false, mensaje: "No se pudieron obtener las tarjetas anteriores." });
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

    const sorteado = await fidelidadHelper.sortearPremio();
    if (!sorteado) {
      return res.status(503).json({ ok: false, mensaje: "No hay premios configurados en este momento." });
    }
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

module.exports = {
  loginGoogle,
  registro,
  loginEmail,
  olvidePassword,
  resetearPassword,
  ingresarTelefono,
  verProgreso,
  girarRuleta,
  verHistorial,
  verTarjetasAnteriores,
};
