const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const {
  showNuevoClienteForm,
  storeNuevoCliente,
  listarClientes,
  mostrarEditarCliente,
  actualizarCliente,
  eliminarCliente,
  exportarClientesExcel,
  importarClientesExcel,
  verHistorialCliente,
} = require("../controllers/clienteController");

const { requireAdmin } = require("../middlewares/authMiddleware");

router.get("/clientes", requireAdmin, listarClientes);

router.get("/clientes/exportar/excel", requireAdmin, exportarClientesExcel);
router.post(
  "/clientes/importar/excel",
  requireAdmin,
  upload.single("archivo"),
  importarClientesExcel,
);

router.get("/clientes/nuevo", requireAdmin, showNuevoClienteForm);
router.post("/clientes/nuevo", requireAdmin, storeNuevoCliente);

router.get("/clientes/:id/editar", requireAdmin, mostrarEditarCliente);
router.post("/clientes/:id/editar", requireAdmin, actualizarCliente);

router.post("/clientes/:id/eliminar", requireAdmin, eliminarCliente);

router.get("/clientes/:id/historial", requireAdmin, verHistorialCliente);

module.exports = router;
