const gastoModel = require("../models/gastoModel");

/* ================================
   LISTADO DE GASTOS
================================ */
const listarGastos = async (req, res) => {
  try {
    const gastos = await gastoModel.getAllGastos();

    res.render("gastos/index", {
      title: "Gastos",
      user: req.session.user,
      gastos,
    });
  } catch (error) {
    console.error("Error al listar gastos:", error);
    res.status(500).send("Error interno");
  }
};

/* ================================
   FORM NUEVO GASTO
================================ */
const mostrarNuevoGasto = (req, res) => {
  res.render("gastos/nuevo", {
    title: "Nuevo gasto",
    user: req.session.user,
  });
};

/* ================================
   CREAR GASTO
================================ */
const crearGasto = async (req, res) => {
  try {
    const { fecha, descripcion, monto, categoria, observaciones } = req.body;

    const montoNumber = Number(monto);

    if (Number.isNaN(montoNumber) || montoNumber < 0) {
      return res.status(400).render("gastos/nuevo", {
        title: "Nuevo gasto",
        user: req.session.user,
        error: "El monto no puede ser negativo.",
        formData: {
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
      descripcion,
      monto: montoNumber,
      categoria,
      observaciones,
    });

    res.redirect("/gastos");
  } catch (error) {
    console.error("Error al crear gasto:", error);
    res.status(500).send("Error interno");
  }
};

module.exports = {
  listarGastos,
  mostrarNuevoGasto,
  crearGasto,
};
