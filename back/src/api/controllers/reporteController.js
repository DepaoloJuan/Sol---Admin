const turnoModel = require("../models/turnoModel");
const gastoModel = require("../models/gastoModel");
const { calcularDatosReportes, formatDate } = require("../../utils/reporteHelpers");

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
    console.error("Error al crear gasto desde reportes:", error);
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
    console.error("Error al eliminar gasto:", error);
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

    const montoNumber = Number(monto);
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
    console.error("Error al actualizar gasto:", error);
    res.status(500).send("Error interno");
  }
};

module.exports = {
  verReportes,
  crearGastoDesdeReportes,
  eliminarGasto,
  actualizarGasto,
};
