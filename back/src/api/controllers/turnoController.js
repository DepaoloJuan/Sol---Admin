const turnoModel = require("../models/turnoModel");
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
    });
  } catch (error) {
    console.error("Error al mostrar edición de turno:", error);
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarTurno = async (req, res) => {
  try {
    const { id } = req.params;

    let costo = Number(req.body.costo || 0);
    let montoAbonado = Number(req.body.monto_abonado || 0);

    if (montoAbonado < 0) {
      montoAbonado = 0;
    }

    if (montoAbonado > costo) {
      montoAbonado = costo;
    }

    let estado = "Pendiente";

    if (montoAbonado <= 0) {
      estado = "Pendiente";
    } else if (montoAbonado >= costo) {
      estado = "Pagado";
    } else {
      estado = "Parcial";
    }

    const data = {
      fecha: req.body.fecha,
      hora: req.body.hora,
      id_cliente: Number(req.body.id_cliente),
      id_empleado: Number(req.body.id_empleado),
      id_servicio: Number(req.body.id_servicio),
      costo,
      estado,
      duracion: Number(req.body.duracion),
      monto_abonado: montoAbonado,
    };

    await turnoModel.updateTurno(id, data);
    await servicioBaseModel.updateDuracionSugerida(
      data.id_servicio,
      data.duracion,
    );

    res.redirect(`/agenda?fecha=${data.fecha}`);
  } catch (error) {
    console.error("Error al actualizar turno:", error);
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarTurno = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener el turno para saber la fecha y poder redirigir luego
    const turno = await turnoModel.getTurnoById(id);

    if (!turno) {
      return res.status(404).send("Turno no encontrado");
    }

    await turnoModel.deleteTurno(id);

    res.redirect(`/agenda?fecha=${turno.fecha.toISOString().split("T")[0]}`);
  } catch (error) {
    console.error("Error al eliminar turno:", error);
    res.status(500).send("Error interno del servidor");
  }
};

module.exports = {
  mostrarEditarTurno,
  actualizarTurno,
  eliminarTurno,
};
