const clienteModel = require("../models/clienteModel");
const logger = require("../../utils/logger");
const ExcelJS = require("exceljs");
const turnoModel = require("../models/turnoModel");

const showNuevoClienteForm = (req, res) => {
  const { returnTo, fecha, hora, empleado } = req.query;

  res.render("clientes/nuevo", {
    title: "Nueva clienta",
    user: req.session.user,
    error: null,
    returnTo: returnTo || "/agenda/nuevo",
    fecha: fecha || "",
    hora: hora || "",
    empleado: empleado || "",
  });
};

const storeNuevoCliente = async (req, res) => {
  try {
    const { nombre, apellido, telefono, returnTo, fecha, hora, empleado } =
      req.body;

    if (!nombre || !apellido) {
      return res.status(400).render("clientes/nuevo", {
        title: "Nueva clienta",
        user: req.session.user,
        error: "Nombre y apellido son obligatorios.",
        returnTo: returnTo || "/agenda/nuevo",
        fecha: fecha || "",
        hora: hora || "",
        empleado: empleado || "",
      });
    }

    await clienteModel.createCliente({ nombre, apellido, telefono });

    const redirectUrl =
      `${returnTo || "/agenda/nuevo"}?fecha=${encodeURIComponent(fecha || "")}` +
      `&hora=${encodeURIComponent(hora || "")}` +
      `&empleado=${encodeURIComponent(empleado || "")}`;

    req.session.flash = { tipo: "success", mensaje: "Clienta creada correctamente." };
    return res.redirect(redirectUrl);
  } catch (error) {
    logger.error("cliente.create.failed", { error: error.message });
    return res.status(500).send("Error al crear clienta");
  }
};

const listarClientes = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    let clientes;

    if (q) {
      clientes = await clienteModel.searchClientes(q);
    } else {
      clientes = await clienteModel.getAllClientes();
    }

    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render("clientes/index", {
      title: "Clientas",
      user: req.session.user,
      clientes,
      q: q || "",
      flash,
    });
  } catch (error) {
    logger.error("cliente.list.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const mostrarEditarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await clienteModel.getClienteById(id);

    if (!cliente) {
      return res.status(404).send("Clienta no encontrada");
    }

    res.render("clientes/editar", {
      title: "Editar clienta",
      user: req.session.user,
      cliente,
      error: null,
    });
  } catch (error) {
    logger.error("cliente.edit.show.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono } = req.body;

    if (!nombre || !apellido) {
      const cliente = await clienteModel.getClienteById(id);
      return res.status(400).render("clientes/editar", {
        title: "Editar clienta",
        user: req.session.user,
        cliente,
        error: "Nombre y apellido son obligatorios.",
      });
    }

    await clienteModel.updateCliente(id, { nombre, apellido, telefono });

    req.session.flash = { tipo: "success", mensaje: "Clienta actualizada correctamente." };
    res.redirect("/clientes");
  } catch (error) {
    logger.error("cliente.update.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await clienteModel.getClienteById(id);
    if (!cliente) {
      return res.status(404).send("Clienta no encontrada");
    }

    await clienteModel.deleteCliente(id);

    req.session.flash = { tipo: "success", mensaje: "Clienta eliminada." };
    res.redirect("/clientes");
  } catch (error) {
    logger.error("cliente.delete.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const exportarClientesExcel = async (req, res) => {
  try {
    const clientes = await clienteModel.getAllClientes();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Clientas");

    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Nombre", key: "nombre", width: 20 },
      { header: "Apellido", key: "apellido", width: 20 },
      { header: "Teléfono", key: "telefono", width: 20 },
    ];

    clientes.forEach((cliente) => {
      worksheet.addRow({
        id: cliente.id,
        nombre: cliente.nombre || "",
        apellido: cliente.apellido || "",
        telefono: cliente.telefono || "",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="clientas.xlsx"',
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("cliente.export.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const importarClientesExcel = async (req, res) => {
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
        nombre: row.getCell(2).value?.toString().trim() || "",
        apellido: row.getCell(3).value?.toString().trim() || "",
        telefono: row.getCell(4).value?.toString().trim() || "",
      });
    });

    for (const fila of filas) {
      if (!fila.nombre || !fila.apellido) continue;
      await clienteModel.createCliente(fila);
    }

    res.redirect("/clientes");
  } catch (error) {
    logger.error("cliente.import.failed", { error: error.message });
    res.status(500).send("Error al importar clientas");
  }
};

const verHistorialCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await clienteModel.getClienteById(id);

    if (!cliente) {
      return res.status(404).send("Clienta no encontrada");
    }

    const turnos = await turnoModel.getUltimosTurnosPorCliente(id, 10);

    res.render("clientes/historial", {
      title: "Historial de clienta",
      user: req.session.user,
      cliente,
      turnos,
    });
  } catch (error) {
    logger.error("cliente.history.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

module.exports = {
  showNuevoClienteForm,
  storeNuevoCliente,
  listarClientes,
  mostrarEditarCliente,
  actualizarCliente,
  eliminarCliente,
  exportarClientesExcel,
  importarClientesExcel,
  verHistorialCliente,
};
