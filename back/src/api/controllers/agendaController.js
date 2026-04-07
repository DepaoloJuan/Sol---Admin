const pool = require("../database/db");
const { getTurnosPorFecha, createTurno } = require("../models/turnoModel");
const { getAllEmpleados, getEmpleadoById } = require("../models/empleadoModel");
const { getAllClientes } = require("../models/clienteModel");
const { getAllServicios } = require("../models/servicioModel");

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

    res.render("agenda/index", {
      title: "Agenda",
      user: req.session.user,
      fecha,
      empleados,
      horarios,
      agendaMap,
    });
  } catch (error) {
    console.error("Error al cargar agenda:", error);
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
    console.error("Error al abrir formulario de turno:", error);
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

    if (!fecha || !hora || !id_cliente || !id_empleado || !id_servicio) {
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
        error: "Completá todos los campos obligatorios.",
      });
    }

    let costoNormalizado = costo ? Number(costo) : 0;
    let duracionNormalizada = duracion ? Number(duracion) : 30;
    let montoAbonadoNormalizado = monto_abonado ? Number(monto_abonado) : 0;

    if (montoAbonadoNormalizado < 0) {
      montoAbonadoNormalizado = 0;
    }

    if (montoAbonadoNormalizado > costoNormalizado) {
      montoAbonadoNormalizado = costoNormalizado;
    }

    let estadoNormalizado = "Pendiente";

    if (montoAbonadoNormalizado <= 0) {
      estadoNormalizado = "Pendiente";
    } else if (montoAbonadoNormalizado >= costoNormalizado) {
      estadoNormalizado = "Pagado";
    } else {
      estadoNormalizado = "Parcial";
    }

    const empleada = await getEmpleadoById(Number(id_empleado));
    const porcentajeGanancia = empleada ? Number(empleada.porcentaje_ganancia || 0) : 0;

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
    });

    const actualizarServicioBase = actualizar_servicio_base === "1";

    if (actualizarServicioBase) {
      await pool.query(
        `UPDATE public.servicios_base
          SET precio = $1,
              duracion_sugerida = $2
          WHERE id = $3`,
        [costoNormalizado, duracionNormalizada, Number(id_servicio)],
      );
    }

    return res.redirect(`/agenda?fecha=${fecha}`);
  } catch (error) {
    console.error("Error al crear turno:", error);
    res.status(500).send("Error al crear turno");
  }
};

module.exports = {
  showAgenda,
  showNuevoTurnoForm,
  storeNuevoTurno,
};
