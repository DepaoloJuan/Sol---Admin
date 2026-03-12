const empleadoModel = require("../models/empleadoModel");
const turnoModel = require("../models/turnoModel");

const listarEmpleados = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    let empleados;

    if (q) {
      empleados = await empleadoModel.searchEmpleados(q);
    } else {
      empleados = await empleadoModel.getAllEmpleados();
    }

    res.render("empleados/index", {
      title: "Empleadas",
      user: req.session.user,
      empleados,
      q: q || "",
    });
  } catch (error) {
    console.error("Error al listar empleadas:", error);
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

    res.redirect("/empleados");
  } catch (error) {
    console.error("Error al crear empleada:", error);
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
    console.error("Error al mostrar edición de empleada:", error);
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

    res.redirect("/empleados");
  } catch (error) {
    console.error("Error al actualizar empleada:", error);
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarEmpleada = async (req, res) => {
  try {
    const { id } = req.params;

    await empleadoModel.deleteEmpleado(id);

    res.redirect("/empleados");
  } catch (error) {
    console.error("Error al eliminar empleada:", error);
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
       CALCULO DE METRICAS GENERALES
    ========================================= */
    const totalTurnos = turnos.length;

    const totalMinutos = turnos.reduce(
      (acc, t) => acc + Number(t.duracion || 0),
      0,
    );

    const horasTrabajadas = (totalMinutos / 60).toFixed(1);

    const facturacionTotal = turnos.reduce(
      (acc, t) => acc + Number(t.costo || 0),
      0,
    );

    const comisionEstimada =
      facturacionTotal * (Number(empleada.porcentaje_ganancia || 0) / 100);

    /* =========================================
       CALCULO DE SEMANA ACTUAL
       Lunes a Domingo
    ========================================= */
    const hoy = new Date();
    const diaActual = hoy.getDay(); // 0 = domingo, 1 = lunes, etc.

    const diferenciaParaLunes = diaActual === 0 ? -6 : 1 - diaActual;

    const primerDiaSemana = new Date(hoy);
    primerDiaSemana.setHours(0, 0, 0, 0);
    primerDiaSemana.setDate(hoy.getDate() + diferenciaParaLunes);

    const ultimoDiaSemana = new Date(primerDiaSemana);
    ultimoDiaSemana.setDate(primerDiaSemana.getDate() + 6);
    ultimoDiaSemana.setHours(23, 59, 59, 999);

    const formatDate = (fecha) => {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, "0");
      const day = String(fecha.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const fechaInicio = formatDate(primerDiaSemana);
    const fechaFin = formatDate(ultimoDiaSemana);

    /* =========================================
       TRAER TURNOS DE LA SEMANA
    ========================================= */
    const turnosSemana = await turnoModel.getTurnosEmpleadoPorRango(
      id,
      fechaInicio,
      fechaFin,
    );

    /* =========================================
       AGRUPAR TURNOS DE LA SEMANA POR DIA
    ========================================= */
    const turnosPorDia = {};

    turnosSemana.forEach((turno) => {
      if (!turnosPorDia[turno.fecha]) {
        turnosPorDia[turno.fecha] = [];
      }
      turnosPorDia[turno.fecha].push(turno);
    });

    /* =========================================
       RENDER
    ========================================= */
    res.render("empleados/perfil", {
      title: "Perfil de empleada",
      user: req.session.user,
      empleada,
      turnos,
      metricas: {
        totalTurnos,
        horasTrabajadas,
        facturacionTotal,
        comisionEstimada,
      },
      fechaInicio,
      fechaFin,
      turnosSemana,
      turnosPorDia,
    });
  } catch (error) {
    console.error("Error al ver perfil de empleada:", error);
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
