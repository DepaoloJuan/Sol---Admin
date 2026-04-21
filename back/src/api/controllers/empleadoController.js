const logger = require("../../utils/logger");
const empleadoModel = require("../models/empleadoModel");
const turnoModel = require("../models/turnoModel");
const userModel = require("../models/userModel");
const { formatDate, calcularMetricas } = require("../../utils/dateHelpers");

const listarEmpleados = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    let empleados;

    if (q) {
      empleados = await empleadoModel.searchEmpleados(q);
    } else {
      empleados = await empleadoModel.getAllEmpleados();
    }

    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render("empleados/index", {
      title: "Empleadas",
      user: req.session.user,
      empleados,
      q: q || "",
      flash,
    });
  } catch (error) {
    logger.error("empleado.list.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const mostrarNuevaEmpleada = (req, res) => {
  res.render("empleados/nuevo", {
    title: "Nueva empleada",
    user: req.session.user,
    error: null,
  });
};

const crearEmpleada = async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, porcentaje_ganancia } = req.body;

    if (!nombre) {
      return res.status(400).render("empleados/nuevo", {
        title: "Nueva empleada",
        user: req.session.user,
        error: "El nombre es obligatorio",
      });
    }

    await empleadoModel.createEmpleado({
      nombre,
      apellido,
      telefono,
      email,
      porcentaje_ganancia: porcentaje_ganancia
        ? Number(porcentaje_ganancia)
        : 0,
    });

    req.session.flash = { tipo: "success", mensaje: "Empleada creada correctamente." };
    res.redirect("/empleados");
  } catch (error) {
    logger.error("empleado.create.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const mostrarEditarEmpleada = async (req, res) => {
  try {
    const { id } = req.params;

    const empleada = await empleadoModel.getEmpleadoById(id);

    if (!empleada) {
      return res.status(404).send("Empleada no encontrada");
    }

    res.render("empleados/editar", {
      title: "Editar empleada",
      user: req.session.user,
      empleada,
      error: null,
    });
  } catch (error) {
    logger.error("empleado.edit.show.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarEmpleada = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono, email, porcentaje_ganancia } = req.body;

    if (!nombre) {
      const empleada = await empleadoModel.getEmpleadoById(id);
      return res.status(400).render("empleados/editar", {
        title: "Editar empleada",
        user: req.session.user,
        empleada,
        error: "El nombre es obligatorio",
      });
    }

    await empleadoModel.updateEmpleado(id, {
      nombre,
      apellido,
      telefono,
      email,
      porcentaje_ganancia: porcentaje_ganancia
        ? Number(porcentaje_ganancia)
        : 0,
    });

    req.session.flash = { tipo: "success", mensaje: "Empleada actualizada correctamente." };
    res.redirect("/empleados");
  } catch (error) {
    logger.error("empleado.update.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarEmpleada = async (req, res) => {
  try {
    const { id } = req.params;

    await userModel.deleteByEmpleadoId(id);
    await empleadoModel.deleteEmpleado(id);

    req.session.flash = { tipo: "success", mensaje: "Empleada eliminada." };
    res.redirect("/empleados");
  } catch (error) {
    logger.error("empleado.delete.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

/* =========================================
   VER PERFIL DE EMPLEADA
========================================= */
const verPerfilEmpleada = async (req, res) => {
  try {
    const { id } = req.params;

    const empleada = await empleadoModel.getEmpleadoById(id);

    if (!empleada) {
      return res.status(404).send("Empleada no encontrada");
    }

    /* =========================================
       TRAER TODOS LOS TURNOS DE LA EMPLEADA
    ========================================= */
    const turnos = await turnoModel.getTurnosPorEmpleado(id);

    /* =========================================
   CALCULAR FECHAS
========================================= */
    const hoy = new Date();

    // Semana actual como default
    const diaActual = hoy.getDay();
    const diferenciaParaLunes = diaActual === 0 ? -6 : 1 - diaActual;
    const primerDiaSemana = new Date(hoy);
    primerDiaSemana.setHours(0, 0, 0, 0);
    primerDiaSemana.setDate(hoy.getDate() + diferenciaParaLunes);
    const ultimoDiaSemana = new Date(primerDiaSemana);
    ultimoDiaSemana.setDate(primerDiaSemana.getDate() + 6);

    const defaultDesde = formatDate(primerDiaSemana);
    const defaultHasta = formatDate(ultimoDiaSemana);

    // Leer filtro de query params o usar semana actual
    const desde = req.query.desde || defaultDesde;
    const hasta = req.query.hasta || defaultHasta;

    const turnosFiltrados = await turnoModel.getTurnosEmpleadoPorRango(
      id,
      desde,
      hasta,
    );

    const metricasFiltradas = calcularMetricas(turnosFiltrados);

    /* =========================================
       RENDER
    ========================================= */
    res.render("empleados/perfil", {
      title: "Perfil de empleada",
      user: req.session.user,
      empleada,
      turnos: turnosFiltrados,
      metricas: metricasFiltradas,
      desde,
      hasta,
    });
  } catch (error) {
    logger.error("empleado.profile.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

module.exports = {
  listarEmpleados,
  mostrarNuevaEmpleada,
  crearEmpleada,
  mostrarEditarEmpleada,
  actualizarEmpleada,
  eliminarEmpleada,
  verPerfilEmpleada,
};
