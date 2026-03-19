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

const { requireAdmin } = require("../middlewares/authMiddleware");

router.get("/servicios/nuevo", requireAdmin, showNuevoServicioForm);
router.get("/servicios", requireAdmin, listarServicios);
router.get("/servicios/exportar/excel", requireAdmin, exportarServiciosExcel);

router.post(
  "/servicios/importar/excel",
  requireAdmin,
  upload.single("archivo"),
  importarServiciosExcel,
);
router.get("/servicios/:id/editar", requireAdmin, mostrarEditarServicio);
router.post("/servicios/:id/editar", requireAdmin, actualizarServicio);
router.post("/servicios/:id/eliminar", requireAdmin, eliminarServicio);
router.post("/servicios/nuevo", requireAdmin, storeNuevoServicio);

module.exports = router;
