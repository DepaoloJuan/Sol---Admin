const turnoModel = require("../models/turnoModel");
const gastoModel = require("../models/gastoModel");
const empleadoModel = require("../models/empleadoModel");
const {
  calcularDatosReportes,
  formatDate,
} = require("../../utils/reporteHelpers");
const logger = require("../../utils/logger");

const verReportes = async (req, res) => {
  try {
    const datos = await calcularDatosReportes(req);

    res.render("reportes/index", {
      title: "Reportes generales",
      user: req.session.user,
      ...datos,
      errorGasto: null,
      gastoForm: {},
      gastoEditandoId: null,
    });
  } catch (error) {
    logger.error("reporte.load.failed", { error: error.message });
    res.status(500).send("Error interno");
  }
};

const crearGastoDesdeReportes = async (req, res) => {
  try {
    const { fecha, descripcion, monto, categoria, observaciones } = req.body;

    const descripcionLimpia = (descripcion || "").trim();
    const fechaValida = fecha && !Number.isNaN(new Date(fecha).getTime());

    if (!fechaValida) {
      const datos = await calcularDatosReportes(req);

      return res.status(400).render("reportes/index", {
        title: "Reportes generales",
        user: req.session.user,
        ...datos,
        errorGasto: "La fecha del gasto es obligatoria y debe ser válida.",
        gastoForm: {
          fecha,
          descripcion,
          monto,
          categoria,
          observaciones,
        },
        gastoEditandoId: null,
      });
    }

    if (!descripcionLimpia) {
      const datos = await calcularDatosReportes(req);

      return res.status(400).render("reportes/index", {
        title: "Reportes generales",
        user: req.session.user,
        ...datos,
        errorGasto: "La descripción del gasto es obligatoria.",
        gastoForm: {
          fecha,
          descripcion,
          monto,
          categoria,
          observaciones,
        },
        gastoEditandoId: null,
      });
    }

    const montoLimpio = String(monto).replace(/\./g, "").replace(",", ".");
    const montoNumber = Number(montoLimpio);

    if (Number.isNaN(montoNumber) || montoNumber < 0) {
      const datos = await calcularDatosReportes(req);

      return res.status(400).render("reportes/index", {
        title: "Reportes generales",
        user: req.session.user,
        ...datos,
        errorGasto: "Ingresá un monto válido mayor o igual a 0.",
        gastoForm: {
          fecha,
          descripcion,
          monto,
          categoria,
          observaciones,
        },
        gastoEditandoId: null,
      });
    }

    await gastoModel.createGasto({
      fecha,
      descripcion: descripcionLimpia,
      monto: montoNumber,
      categoria,
      observaciones,
    });

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const desdeRedirect = req.body.desde || formatDate(inicioMes);
    const hastaRedirect = req.body.hasta || formatDate(hoy);

    res.redirect(`/reportes?desde=${desdeRedirect}&hasta=${hastaRedirect}`);
  } catch (error) {
    logger.error("gasto.create.failed", { error: error.message });
    res.status(500).send("Error interno");
  }
};

/* ================================
   ELIMINAR GASTO
================================ */
const eliminarGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const { desde, hasta } = req.body;

    await gastoModel.deleteGasto(id);

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const desdeRedirect = desde || formatDate(inicioMes);
    const hastaRedirect = hasta || formatDate(hoy);

    res.redirect(`/reportes?desde=${desdeRedirect}&hasta=${hastaRedirect}`);
  } catch (error) {
    logger.error("gasto.delete.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno");
  }
};

/* ================================
   ACTUALIZAR GASTO
================================ */
const actualizarGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, descripcion, monto, categoria, observaciones } = req.body;

    const descripcionLimpia = (descripcion || "").trim();
    const fechaValida = fecha && !Number.isNaN(new Date(fecha).getTime());

    const fakeReq = { body: req.body, query: req.query };

    if (!fechaValida) {
      const datos = await calcularDatosReportes(fakeReq);
      return res.status(400).render("reportes/index", {
        title: "Reportes generales",
        user: req.session.user,
        ...datos,
        errorGasto: "La fecha del gasto es obligatoria y debe ser válida.",
        gastoForm: { fecha, descripcion, monto, categoria, observaciones },
        gastoEditandoId: id,
      });
    }

    if (!descripcionLimpia) {
      const datos = await calcularDatosReportes(fakeReq);
      return res.status(400).render("reportes/index", {
        title: "Reportes generales",
        user: req.session.user,
        ...datos,
        errorGasto: "La descripción del gasto es obligatoria.",
        gastoForm: { fecha, descripcion, monto, categoria, observaciones },
        gastoEditandoId: id,
      });
    }

    const montoLimpio = String(monto).replace(/\./g, "").replace(",", ".");
    const montoNumber = Number(montoLimpio);
    if (Number.isNaN(montoNumber) || montoNumber < 0) {
      const datos = await calcularDatosReportes(fakeReq);
      return res.status(400).render("reportes/index", {
        title: "Reportes generales",
        user: req.session.user,
        ...datos,
        errorGasto: "Ingresá un monto válido mayor o igual a 0.",
        gastoForm: { fecha, descripcion, monto, categoria, observaciones },
        gastoEditandoId: id,
      });
    }

    await gastoModel.updateGasto(id, {
      fecha,
      descripcion: descripcionLimpia,
      monto: montoNumber,
      categoria,
      observaciones,
    });

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const desdeRedirect = req.body.desde || formatDate(inicioMes);
    const hastaRedirect = req.body.hasta || formatDate(hoy);

    res.redirect(`/reportes?desde=${desdeRedirect}&hasta=${hastaRedirect}`);
  } catch (error) {
    logger.error("gasto.update.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno");
  }
};

const verReporteAnual = async (req, res) => {
  try {
    // Años seleccionados — por defecto el año actual
    const anioActual = new Date().getFullYear();
    let anios = req.query.anios
      ? req.query.anios.split(",").map(Number)
      : [anioActual];

    // Eliminar duplicados y ordenar
    anios = [...new Set(anios)].sort();

    const datosPorAnio = await Promise.all(
      anios.map(async (anio) => {
        const meses = await Promise.all(
          Array.from({ length: 12 }, async (_, i) => {
            const mes = i + 1;
            const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
            const ultimoDia = new Date(anio, mes, 0).getDate();
            const hasta = `${anio}-${String(mes).padStart(2, "0")}-${ultimoDia}`;

            const turnos = await turnoModel.getTurnosPorRango(desde, hasta);
            const gastos = await gastoModel.getGastosPorRango(desde, hasta);
            const empleados = await empleadoModel.getAllEmpleados();

            const totalTurnos = turnos.length;
            const totalFacturado = turnos.reduce((acc, t) => acc + Number(t.costo || 0), 0);
            const totalCobrado = turnos.reduce((acc, t) => {
              if (t.estado === "Pagado") return acc + Number(t.costo || 0);
              return acc + Number(t.monto_abonado || 0);
            }, 0);
            const totalDeuda = turnos.reduce((acc, t) => {
              if (t.estado === "Pagado") return acc;
              return acc + (Number(t.costo || 0) - Number(t.monto_abonado || 0));
            }, 0);
            const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto || 0), 0);
            const totalSueldos = empleados.reduce((accEmp, emp) => {
              const turnosEmp = turnos.filter((t) => Number(t.id_empleado) === Number(emp.id));
              return accEmp + turnosEmp.reduce(
                (acc, t) => acc + Number(t.costo || 0) * (Number(t.porcentaje_ganancia || 0) / 100),
                0,
              );
            }, 0);
            const gananciaNeta = totalCobrado - totalGastos - totalSueldos;

            return {
              mes,
              nombreMes: new Date(anio, i, 1).toLocaleString("es-AR", { month: "long" }),
              totalTurnos,
              totalFacturado,
              totalCobrado,
              totalDeuda,
              totalGastos,
              totalSueldos,
              gananciaNeta,
            };
          }),
        );

        // Totales del año
        const totales = meses.reduce(
          (acc, m) => ({
            totalTurnos: acc.totalTurnos + m.totalTurnos,
            totalFacturado: acc.totalFacturado + m.totalFacturado,
            totalCobrado: acc.totalCobrado + m.totalCobrado,
            totalDeuda: acc.totalDeuda + m.totalDeuda,
            totalGastos: acc.totalGastos + m.totalGastos,
            totalSueldos: acc.totalSueldos + m.totalSueldos,
            gananciaNeta: acc.gananciaNeta + m.gananciaNeta,
          }),
          {
            totalTurnos: 0,
            totalFacturado: 0,
            totalCobrado: 0,
            totalDeuda: 0,
            totalGastos: 0,
            totalSueldos: 0,
            gananciaNeta: 0,
          },
        );

        return { anio, meses, totales };
      }),
    );

    res.render("reportes/anual", {
      title: "Reporte Anual",
      user: req.session.user,
      datosPorAnio,
      anios,
      anioActual,
    });
  } catch (error) {
    logger.error("reporte.anual.failed", { error: error.message });
    res.status(500).send("Error interno");
  }
};

module.exports = {
  verReportes,
  crearGastoDesdeReportes,
  eliminarGasto,
  actualizarGasto,
  verReporteAnual,
};
