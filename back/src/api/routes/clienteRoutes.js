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
} = require("../controllers/clienteController");

const { requireAuth } = require("../middlewares/authMiddleware");

router.get("/clientes", requireAuth, listarClientes);

router.get("/clientes/exportar/excel", requireAuth, exportarClientesExcel);
router.post(
  "/clientes/importar/excel",
  requireAuth,
  upload.single("archivo"),
  importarClientesExcel,
);

router.get("/clientes/nuevo", requireAuth, showNuevoClienteForm);
router.post("/clientes/nuevo", requireAuth, storeNuevoCliente);

router.get("/clientes/:id/editar", requireAuth, mostrarEditarCliente);
router.post("/clientes/:id/editar", requireAuth, actualizarCliente);

router.post("/clientes/:id/eliminar", requireAuth, eliminarCliente);

module.exports = router;
