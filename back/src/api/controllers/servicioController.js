const servicioModel = require("../models/servicioModel");
const logger = require("../../utils/logger");
const ExcelJS = require("exceljs");

const showNuevoServicioForm = (req, res) => {
  const { returnTo, fecha, hora, empleado, clienteId } = req.query;

  res.render("servicios/nuevo", {
    title: "Nuevo servicio",
    user: req.session.user,
    error: null,
    returnTo: returnTo || "/agenda/nuevo",
    fecha: fecha || "",
    hora: hora || "",
    empleado: empleado || "",
    clienteId: clienteId || "",
  });
};

const storeNuevoServicio = async (req, res) => {
  try {
    const {
      descripcion,
      precio,
      duracion_sugerida,
      returnTo,
      fecha,
      hora,
      empleado,
      clienteId,
    } = req.body;

    if (!descripcion) {
      return res.status(400).render("servicios/nuevo", {
        title: "Nuevo servicio",
        user: req.session.user,
        error: "La descripción es obligatoria.",
        returnTo: returnTo || "/agenda/nuevo",
        fecha: fecha || "",
        hora: hora || "",
        empleado: empleado || "",
        clienteId: clienteId || "",
      });
    }

    const nuevoServicio = await servicioModel.createServicio({
      descripcion,
      precio: precio ? Number(precio) : 0,
      duracion_sugerida: duracion_sugerida ? Number(duracion_sugerida) : 30,
    });

    const redirectUrl =
      `${returnTo || "/agenda/nuevo"}?fecha=${encodeURIComponent(fecha || "")}` +
      `&hora=${encodeURIComponent(hora || "")}` +
      `&empleado=${encodeURIComponent(empleado || "")}` +
      `&servicioId=${nuevoServicio.id}` +
      (clienteId ? `&clienteId=${encodeURIComponent(clienteId)}` : "");

    req.session.flash = { tipo: "success", mensaje: "Servicio creado correctamente." };
    return res.redirect(redirectUrl);
  } catch (error) {
    logger.error("servicio.create.failed", { error: error.message });
    return res.status(500).send("Error al crear servicio");
  }
};

const listarServicios = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    let servicios;

    if (q) {
      servicios = await servicioModel.searchServicios(q);
    } else {
      servicios = await servicioModel.getAllServicios();
    }

    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render("servicios/index", {
      title: "Servicios",
      user: req.session.user,
      servicios,
      q: q || "",
      flash,
    });
  } catch (error) {
    logger.error("servicio.list.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const mostrarEditarServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const servicio = await servicioModel.getServicioById(id);

    if (!servicio) {
      return res.status(404).send("Servicio no encontrado");
    }

    res.render("servicios/editar", {
      title: "Editar servicio",
      user: req.session.user,
      servicio,
      error: null,
    });
  } catch (error) {
    logger.error("servicio.edit.show.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, precio, duracion_sugerida } = req.body;

    if (!descripcion) {
      const servicio = await servicioModel.getServicioById(id);
      return res.status(400).render("servicios/editar", {
        title: "Editar servicio",
        user: req.session.user,
        servicio,
        error: "La descripción es obligatoria.",
      });
    }

    await servicioModel.updateServicio(id, {
      descripcion,
      precio: precio ? Number(precio) : 0,
      duracion_sugerida: duracion_sugerida ? Number(duracion_sugerida) : 30,
    });

    req.session.flash = { tipo: "success", mensaje: "Servicio actualizado correctamente." };
    res.redirect("/servicios");
  } catch (error) {
    logger.error("servicio.update.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const servicio = await servicioModel.getServicioById(id);
    if (!servicio) {
      return res.status(404).send("Servicio no encontrado");
    }

    await servicioModel.deleteServicio(id);

    req.session.flash = { tipo: "success", mensaje: "Servicio eliminado." };
    res.redirect("/servicios");
  } catch (error) {
    logger.error("servicio.delete.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const exportarServiciosExcel = async (req, res) => {
  try {
    const servicios = await servicioModel.getAllServicios();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Servicios");

    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Descripción", key: "descripcion", width: 30 },
      { header: "Precio", key: "precio", width: 15 },
      { header: "Duración sugerida (min)", key: "duracion", width: 25 },
    ];

    servicios.forEach((servicio) => {
      worksheet.addRow({
        id: servicio.id,
        descripcion: servicio.descripcion || "",
        precio: servicio.precio || 0,
        duracion: servicio.duracion_sugerida || 30,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="servicios.xlsx"',
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("servicio.export.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const importarServiciosExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No se subió ningún archivo");
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];

    const filas = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // saltear encabezados

      filas.push({
        descripcion: row.getCell(2).value?.toString().trim() || "",
        precio: Number(row.getCell(3).value || 0),
        duracion_sugerida: Number(row.getCell(4).value || 30),
      });
    });

    for (const fila of filas) {
      if (!fila.descripcion) continue;

      await servicioModel.createServicio({
        descripcion: fila.descripcion,
        precio: fila.precio,
        duracion_sugerida: fila.duracion_sugerida,
      });
    }

    res.redirect("/servicios");
  } catch (error) {
    logger.error("servicio.import.failed", { error: error.message });
    res.status(500).send("Error al importar servicios");
  }
};

module.exports = {
  showNuevoServicioForm,
  storeNuevoServicio,
  listarServicios,
  mostrarEditarServicio,
  actualizarServicio,
  eliminarServicio,
  exportarServiciosExcel,
  importarServiciosExcel,
};
