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

const { requireAuth } = require("../middlewares/authMiddleware");

router.get("/servicios/nuevo", requireAuth, showNuevoServicioForm);
router.get("/servicios", requireAuth, listarServicios);
router.get("/servicios/exportar/excel", requireAuth, exportarServiciosExcel);
router.get("/servicios", requireAuth, listarServicios);
router.get("/servicios/exportar/excel", requireAuth, exportarServiciosExcel);

router.post(
  "/servicios/importar/excel",
  requireAuth,
  upload.single("archivo"),
  importarServiciosExcel,
);
router.get("/servicios/:id/editar", requireAuth, mostrarEditarServicio);
router.post("/servicios/:id/editar", requireAuth, actualizarServicio);
router.post("/servicios/:id/eliminar", requireAuth, eliminarServicio);
router.post("/servicios/nuevo", requireAuth, storeNuevoServicio);

module.exports = router;
