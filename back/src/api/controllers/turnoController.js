const turnoModel = require("../models/turnoModel");
const logger = require("../../utils/logger");
const clienteModel = require("../models/clienteModel");
const empleadoModel = require("../models/empleadoModel");
const servicioBaseModel = require("../models/servicioModel");

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
    } = req.body;

    if (!fecha || !hora || !id_cliente || !id_empleado || !id_servicio) {
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
        error: "Completá todos los campos obligatorios.",
        user: req.session.user,
      });
    }

    let costoNormalizado = Number(costo || 0);
    let duracionNormalizada = Number(duracion || 30);
    let montoAbonadoNormalizado = Number(monto_abonado || 0);

    if (costoNormalizado < 0) {
      costoNormalizado = 0;
    }

    if (duracionNormalizada <= 0) {
      duracionNormalizada = 30;
    }

    if (montoAbonadoNormalizado < 0) {
      montoAbonadoNormalizado = 0;
    }

    if (montoAbonadoNormalizado > costoNormalizado) {
      montoAbonadoNormalizado = costoNormalizado;
    }

    let estado = "Pendiente";

    if (montoAbonadoNormalizado <= 0) {
      estado = "Pendiente";
    } else if (montoAbonadoNormalizado >= costoNormalizado) {
      estado = "Pagado";
    } else {
      estado = "Parcial";
    }

    const propinaNormalizada = Math.max(0, Number(propina || 0));
    const porcentajeGanancia = Number(req.body.porcentaje_ganancia || 0);

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

    await turnoModel.updateTurno(id, data);

    const actualizarServicioBase = actualizar_servicio_base === "1";

    if (actualizarServicioBase) {
      await servicioBaseModel.updatePrecioYDuracionSugerida(
        data.id_servicio,
        data.costo,
        data.duracion,
      );
    }

    req.session.flash = { tipo: "success", mensaje: "Turno actualizado correctamente." };
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
