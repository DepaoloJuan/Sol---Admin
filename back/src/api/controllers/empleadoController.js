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
   FUNCIÓN HELPER PARA CALCULAR MÉTRICAS
========================================= */
    const calcularMetricas = (lista, porcentaje) => {
      const totalTurnos = lista.length;
      const totalMinutos = lista.reduce(
        (acc, t) => acc + Number(t.duracion || 0),
        0,
      );
      const horasTrabajadas = (totalMinutos / 60).toFixed(1);
      const facturacionTotal = lista.reduce(
        (acc, t) => acc + Number(t.costo || 0),
        0,
      );
      const comisionEstimada =
        facturacionTotal * (Number(porcentaje || 0) / 100);
      const totalPropinas = lista.reduce(
        (acc, t) => acc + Number(t.propina || 0),
        0,
      );
      return {
        totalTurnos,
        horasTrabajadas,
        facturacionTotal,
        comisionEstimada,
        totalPropinas,
      };
    };

    /* =========================================
   CALCULAR FECHAS
========================================= */
    const hoy = new Date();

    const formatDate = (fecha) => {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, "0");
      const day = String(fecha.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

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

    const metricasFiltradas = calcularMetricas(
      turnosFiltrados,
      empleada.porcentaje_ganancia,
    );

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
