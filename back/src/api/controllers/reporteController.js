const turnoModel = require("../models/turnoModel");
const gastoModel = require("../models/gastoModel");

const calcularDatosReportes = async (req) => {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const formatDate = (d) => d.toISOString().split("T")[0];

  const desde =
    (req.body && req.body.desde) ||
    (req.query && req.query.desde) ||
    formatDate(inicioMes);
  const hasta =
    (req.body && req.body.hasta) ||
    (req.query && req.query.hasta) ||
    formatDate(hoy);

  const turnos = await turnoModel.getTurnosPorRango(desde, hasta);
  const gastos = await gastoModel.getGastosPorRango(desde, hasta);

  const totalTurnos = turnos.length;

  const totalFacturado = turnos.reduce(
    (acc, t) => acc + Number(t.costo || 0),
    0,
  );

  const totalCobrado = turnos.reduce((acc, t) => {
    if (t.estado === "Pagado") return acc + Number(t.costo || 0);
    return acc + Number(t.monto_abonado || 0);
  }, 0);

  const totalDeuda = turnos.reduce((acc, t) => {
    if (t.estado === "Pagado") return acc;
    return acc + (Number(t.costo || 0) - Number(t.monto_abonado || 0));
  }, 0);

  const totalGastos = gastos.reduce(
    (acc, g) => acc + Number(g.monto || 0),
    0,
  );

  const gananciaNeta = totalCobrado - totalGastos;

  return {
    desde,
    hasta,
    turnos,
    gastos,
    resumen: {
      totalTurnos,
      totalFacturado,
      totalCobrado,
      totalDeuda,
      totalGastos,
      gananciaNeta,
    },
  };
};

const verReportes = async (req, res) => {
  try {
    const datos = await calcularDatosReportes(req);

    res.render("reportes/index", {
      title: "Reportes generales",
      user: req.session.user,
      ...datos,
      errorGasto: null,
      gastoForm: {},
    });
  } catch (error) {
    console.error("Error en reportes:", error);
    res.status(500).send("Error interno");
  }
};

const crearGastoDesdeReportes = async (req, res) => {
  try {
    const { fecha, descripcion, monto, categoria, observaciones } = req.body;

    const descripcionLimpia = (descripcion || "").trim();
    const fechaValida =
      fecha && !Number.isNaN(new Date(fecha).getTime());

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
      });
    }

    const montoNumber = Number(monto);

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
    const formatDate = (d) => d.toISOString().split("T")[0];

    const desdeRedirect = req.body.desde || formatDate(inicioMes);
    const hastaRedirect = req.body.hasta || formatDate(hoy);

    res.redirect(`/reportes?desde=${desdeRedirect}&hasta=${hastaRedirect}`);
  } catch (error) {
    console.error("Error al crear gasto desde reportes:", error);
    res.status(500).send("Error interno");
  }
};

module.exports = {
  verReportes,
  crearGastoDesdeReportes,
};
