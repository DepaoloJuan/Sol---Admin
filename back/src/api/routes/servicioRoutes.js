const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const {
  showNuevoServicioForm,
  storeNuevoServicio,
  listarServicios,
  mostrarEditarServicio,
  actualizarServicio,
  eliminarServicio,
  exportarServiciosExcel,
  importarServiciosExcel,
} = require("../controllers/servicioController");

const { requireAdmin, requireAdminOMili } = require("../middlewares/authMiddleware");

router.get("/servicios/nuevo", requireAdminOMili, showNuevoServicioForm);
router.get("/servicios", requireAdminOMili, listarServicios);
router.get("/servicios/exportar/excel", requireAdmin, exportarServiciosExcel);

router.post(
  "/servicios/importar/excel",
  requireAdmin,
  upload.single("archivo"),
  importarServiciosExcel,
);
router.get("/servicios/:id/editar", requireAdminOMili, mostrarEditarServicio);
router.post("/servicios/:id/editar", requireAdminOMili, actualizarServicio);
router.post("/servicios/:id/eliminar", requireAdminOMili, eliminarServicio);
router.post("/servicios/nuevo", requireAdminOMili, storeNuevoServicio);

module.exports = router;
