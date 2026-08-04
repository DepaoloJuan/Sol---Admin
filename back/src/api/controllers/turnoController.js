const turnoModel = require("../models/turnoModel");
const logger = require("../../utils/logger");
const clienteModel = require("../models/clienteModel");
const empleadoModel = require("../models/empleadoModel");
const servicioBaseModel = require("../models/servicioModel");
const pool = require("../database/db");
const { validarCamposObligatorios, validarHorario, validarDuracion, validarMontos, validarMetodoPago } = require("../validators/turnoValidator");
const { normalizarDatosTurno } = require("../../utils/turnoHelpers");
const { getUsuarioByEmpleadoId } = require("../models/userModel");
const { getSuscripcionesPorUsuario } = require("../models/pushSubscriptionModel");
const { enviarPushATodas } = require("../../utils/pushHelper");

/**
 * A partir de los registros de turno_pagos, deriva los valores para
 * pre-popular el form: 1 registro = método simple, 2 registros = mixto.
 */
const derivarMetodoPagoInicial = (pagos) => {
  if (!pagos || pagos.length === 0) {
    return { metodo_pago: "", monto_efectivo: "", monto_transferencia: "" };
  }
  if (pagos.length === 1) {
    return { metodo_pago: pagos[0].metodo, monto_efectivo: "", monto_transferencia: "" };
  }
  const efectivo = pagos.find((p) => p.metodo === "efectivo");
  const transferencia = pagos.find((p) => p.metodo === "transferencia");
  return {
    metodo_pago: "mixto",
    monto_efectivo: efectivo ? efectivo.monto : "",
    monto_transferencia: transferencia ? transferencia.monto : "",
  };
};

const mostrarEditarTurno = async (req, res) => {
  try {
    const { id } = req.params;

    const turno = await turnoModel.getTurnoById(id);

    if (!turno) {
      return res.status(404).send("Turno no encontrado");
    }

    const clientes = await clienteModel.getAllClientes();
    const empleados = await empleadoModel.getAllEmpleados();
    const servicios = await servicioBaseModel.getAllServicios();

    res.render("agenda/editar", {
      turno,
      clientes,
      empleados,
      servicios,
      metodoPago: derivarMetodoPagoInicial(turno.pagos),
      error: null,
      user: req.session.user,
    });
  } catch (error) {
    logger.error("turno.edit.show.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarTurno = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      fecha,
      hora,
      id_cliente,
      id_empleado,
      id_servicio,
      costo,
      duracion,
      monto_abonado,
      propina,
      actualizar_servicio_base,
      metodo_pago,
      monto_efectivo,
      monto_transferencia,
    } = req.body;

    const errorValidacion =
      validarCamposObligatorios({ fecha, hora, id_cliente, id_empleado, id_servicio }) ||
      validarHorario(hora) ||
      validarDuracion(duracion) ||
      validarMontos(costo, monto_abonado) ||
      validarMetodoPago({ metodo_pago, monto_efectivo, monto_transferencia, monto_abonado });

    if (errorValidacion) {
      const turno = await turnoModel.getTurnoById(id);
      const clientes = await clienteModel.getAllClientes();
      const empleados = await empleadoModel.getAllEmpleados();
      const servicios = await servicioBaseModel.getAllServicios();

      return res.status(400).render("agenda/editar", {
        turno: {
          ...turno,
          fecha,
          hora,
          id_cliente: Number(id_cliente),
          id_empleado: Number(id_empleado),
          id_servicio: Number(id_servicio),
          costo: Number(costo || 0),
          duracion: Number(duracion || 30),
          monto_abonado: Number(monto_abonado || 0),
        },
        clientes,
        empleados,
        servicios,
        metodoPago: {
          metodo_pago: metodo_pago || "",
          monto_efectivo: monto_efectivo || "",
          monto_transferencia: monto_transferencia || "",
        },
        error: errorValidacion,
        user: req.session.user,
      });
    }

    const turnoPrevio = await turnoModel.getTurnoById(id);
    const idEmpleadoAnterior = turnoPrevio ? Number(turnoPrevio.id_empleado) : null;

    const { costoNormalizado, duracionNormalizada, montoAbonadoNormalizado, estado, propinaNormalizada } = normalizarDatosTurno({ costo, duracion, monto_abonado, propina });
    const porcentajeGanancia = Number(req.body.porcentaje_ganancia || 0);

    const turnoSolapado = await turnoModel.existeSolapamiento(
      Number(id_empleado),
      fecha,
      hora,
      duracionNormalizada,
      Number(id),
    );

    if (turnoSolapado) {
      const turno = turnoPrevio;
      const clientes = await clienteModel.getAllClientes();
      const empleados = await empleadoModel.getAllEmpleados();
      const servicios = await servicioBaseModel.getAllServicios();

      return res.status(400).render("agenda/editar", {
        turno: {
          ...turno,
          fecha,
          hora,
          id_cliente: Number(id_cliente),
          id_empleado: Number(id_empleado),
          id_servicio: Number(id_servicio),
          costo: Number(costo || 0),
          duracion: Number(duracion || 30),
          monto_abonado: Number(monto_abonado || 0),
        },
        clientes,
        empleados,
        servicios,
        metodoPago: {
          metodo_pago: metodo_pago || "",
          monto_efectivo: monto_efectivo || "",
          monto_transferencia: monto_transferencia || "",
        },
        error: `Esta empleada ya tiene un turno a las ${turnoSolapado.hora} con ${turnoSolapado.cliente_nombre || "otro cliente"} ${turnoSolapado.cliente_apellido || ""}.`.trim(),
        user: req.session.user,
      });
    }

    const data = {
      fecha,
      hora,
      id_cliente: Number(id_cliente),
      id_empleado: Number(id_empleado),
      id_servicio: Number(id_servicio),
      costo: costoNormalizado,
      estado,
      duracion: duracionNormalizada,
      monto_abonado: montoAbonadoNormalizado,
      propina: propinaNormalizada,
      porcentaje_ganancia: porcentajeGanancia,
    };

    let pagos = [];
    if (montoAbonadoNormalizado > 0) {
      pagos =
        metodo_pago === "mixto"
          ? [
              { metodo: "efectivo", monto: Number(monto_efectivo) },
              { metodo: "transferencia", monto: Number(monto_transferencia) },
            ]
          : [{ metodo: metodo_pago, monto: montoAbonadoNormalizado }];
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await turnoModel.updateTurno(id, data, client);
      await turnoModel.eliminarPagosDeTurno(id, client);
      await turnoModel.insertarPagos(id, pagos, client);
      await client.query("COMMIT");
    } catch (errorTransaccion) {
      await client.query("ROLLBACK");
      throw errorTransaccion;
    } finally {
      client.release();
    }

    const actualizarServicioBase = actualizar_servicio_base === "1";

    if (actualizarServicioBase) {
      await servicioBaseModel.updatePrecioYDuracionSugerida(
        data.id_servicio,
        data.costo,
        data.duracion,
      );
    }

    if (idEmpleadoAnterior !== null && idEmpleadoAnterior !== data.id_empleado) {
      try {
        const usuario = await getUsuarioByEmpleadoId(data.id_empleado);
        if (usuario) {
          const suscripciones = await getSuscripcionesPorUsuario(usuario.id);
          if (suscripciones.length > 0) {
            const cliente = await clienteModel.getClienteById(data.id_cliente);
            await enviarPushATodas(suscripciones, {
              title: "Turno nuevo asignado",
              body: `${data.fecha} ${data.hora} - ${cliente ? cliente.nombre : "Cliente"}`,
              url: `/agenda?fecha=${data.fecha}`,
            });
          }
        }
      } catch (pushError) {
        logger.error("turno.update.push.failed", { id, error: pushError.message });
      }
    }

    req.session.flash = { tipo: "success", mensaje: "Turno actualizado correctamente." };

    const { desde: desdeReportes, hasta: hastaReportes } = req.body;
    if (desdeReportes && hastaReportes) {
      return res.redirect(`/reportes?desde=${desdeReportes}&hasta=${hastaReportes}`);
    }

    res.redirect(`/agenda?fecha=${data.fecha}`);
  } catch (error) {
    logger.error("turno.update.failed", {
      id: req.params.id,
      userId: req.session?.user?.id,
      error: error.message,
    });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarTurno = async (req, res) => {
  try {
    const { id } = req.params;

    const turno = await turnoModel.getTurnoById(id);

    if (!turno) {
      return res.status(404).send("Turno no encontrado");
    }

    await turnoModel.deleteTurno(id);

    req.session.flash = { tipo: "success", mensaje: "Turno eliminado." };
    res.redirect(`/agenda?fecha=${turno.fecha.toISOString().split("T")[0]}`);
  } catch (error) {
    logger.error("turno.delete.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

module.exports = {
  mostrarEditarTurno,
  actualizarTurno,
  eliminarTurno,
};
