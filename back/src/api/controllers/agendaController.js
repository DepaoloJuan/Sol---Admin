const pool = require("../database/db");
const logger = require("../../utils/logger");
const { getTurnosPorFecha, createTurno } = require("../models/turnoModel");
const { getAllEmpleados, getEmpleadoById } = require("../models/empleadoModel");
const { getAllClientes } = require("../models/clienteModel");
const { getAllServicios, actualizarPrecioEnTransaccion } = require("../models/servicioModel");
const { normalizarDatosTurno } = require("../../utils/turnoHelpers");
const { validarCamposObligatorios, validarHorario, validarDuracion, validarMontos } = require("../validators/turnoValidator");

const generarHorarios = () => {
  const horarios = [];
  let hora = 8;
  let minutos = 0;

  while (hora < 20) {
    const hh = String(hora).padStart(2, "0");
    const mm = String(minutos).padStart(2, "0");
    horarios.push(`${hh}:${mm}`);

    minutos += 30;
    if (minutos === 60) {
      minutos = 0;
      hora++;
    }
  }

  return horarios;
};

const normalizarHora = (horaDB) => {
  if (!horaDB) return "";
  return String(horaDB).slice(0, 5);
};

const showAgenda = async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split("T")[0];

    const empleados = await getAllEmpleados();
    const turnos = await getTurnosPorFecha(fecha);
    const horarios = generarHorarios();

    const agendaMap = {};

    turnos.forEach((turno) => {
      const horaInicio = normalizarHora(turno.hora);
      const empleadoId = turno.id_empleado;
      const bloques = Math.max(1, Math.floor((turno.duracion || 30) / 30));
      const key = `${horaInicio}-${empleadoId}`;

      agendaMap[key] = {
        ...turno,
        bloques,
      };
    });

    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render("agenda/index", {
      title: "Agenda",
      user: req.session.user,
      fecha,
      empleados,
      horarios,
      agendaMap,
      flash,
    });
  } catch (error) {
    logger.error("agenda.show.failed", { error: error.message });
    res.status(500).send("Error al cargar la agenda");
  }
};

const showNuevoTurnoForm = async (req, res) => {
  try {
    const { fecha, hora, empleado } = req.query;

    const clientes = await getAllClientes();
    const servicios = await getAllServicios();
    const empleados = await getAllEmpleados();

    res.render("agenda/nuevo", {
      title: "Nuevo turno",
      user: req.session.user,
      fecha,
      hora,
      empleadoSeleccionado: Number(empleado),
      clientes,
      servicios,
      empleados,
      error: null,
    });
  } catch (error) {
    logger.error("agenda.form.failed", { error: error.message });
    res.status(500).send("Error al abrir formulario de turno");
  }
};

const storeNuevoTurno = async (req, res) => {
  try {
    const {
      fecha,
      hora,
      id_cliente,
      id_empleado,
      id_servicio,
      costo,
      estado,
      duracion,
      monto_abonado,
      actualizar_servicio_base,
    } = req.body;

    const errorValidacion =
      validarCamposObligatorios({ fecha, hora, id_cliente, id_empleado, id_servicio }) ||
      validarHorario(hora) ||
      validarDuracion(duracion) ||
      validarMontos(costo, monto_abonado);

    if (errorValidacion) {
      const clientes = await getAllClientes();
      const servicios = await getAllServicios();
      const empleados = await getAllEmpleados();

      return res.status(400).render("agenda/nuevo", {
        title: "Nuevo turno",
        user: req.session.user,
        fecha,
        hora,
        empleadoSeleccionado: Number(id_empleado),
        clientes,
        servicios,
        empleados,
        error: errorValidacion,
      });
    }

    const { costoNormalizado, duracionNormalizada, montoAbonadoNormalizado, estado: estadoNormalizado } = normalizarDatosTurno({ costo, duracion, monto_abonado });

    const empleada = await getEmpleadoById(Number(id_empleado));
    const porcentajeGanancia = empleada ? Number(empleada.porcentaje_ganancia || 0) : 0;

    const actualizarServicioBase = actualizar_servicio_base === "1";

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await createTurno({
        fecha,
        hora,
        id_cliente: Number(id_cliente),
        id_empleado: Number(id_empleado),
        id_servicio: Number(id_servicio),
        costo: costoNormalizado,
        estado: estadoNormalizado,
        duracion: duracionNormalizada,
        monto_abonado: montoAbonadoNormalizado,
        porcentaje_ganancia: porcentajeGanancia,
      }, client);

      if (actualizarServicioBase) {
        await actualizarPrecioEnTransaccion(client, Number(id_servicio), costoNormalizado, duracionNormalizada);
      }

      await client.query("COMMIT");
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }

    req.session.flash = { tipo: "success", mensaje: "Turno creado correctamente." };
    return res.redirect(`/agenda?fecha=${fecha}`);
  } catch (error) {
    logger.error("agenda.create.failed", {
      userId: req.session?.user?.id,
      body: req.body,
      error: error.message,
    });
    res.status(500).send("Error al crear turno");
  }
};

module.exports = {
  showAgenda,
  showNuevoTurnoForm,
  storeNuevoTurno,
};
