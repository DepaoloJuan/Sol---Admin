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
  agregarNotaCliente,
} = require("../controllers/clienteController");

const { requireAdmin, requireAdminOMili } = require("../middlewares/authMiddleware");

router.get("/clientes", requireAdminOMili, listarClientes);

router.get("/clientes/exportar/excel", requireAdmin, exportarClientesExcel);
router.post(
  "/clientes/importar/excel",
  requireAdmin,
  upload.single("archivo"),
  importarClientesExcel,
);

router.get("/clientes/nuevo", requireAdminOMili, showNuevoClienteForm);
router.post("/clientes/nuevo", requireAdminOMili, storeNuevoCliente);

router.get("/clientes/:id/editar", requireAdminOMili, mostrarEditarCliente);
router.post("/clientes/:id/editar", requireAdminOMili, actualizarCliente);

router.post("/clientes/:id/eliminar", requireAdmin, eliminarCliente);

router.get("/clientes/:id/historial", requireAdminOMili, verHistorialCliente);
router.post("/clientes/:id/notas", requireAdminOMili, agregarNotaCliente);

module.exports = router;
