const express = require("express");
const router = express.Router();
const laserController = require("../controllers/laserController");
const { requireAdmin } = require("../middlewares/authMiddleware");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// Dashboard
router.get("/laser", requireAdmin, laserController.listarDias);

// Catálogo
router.get("/laser/catalogo", requireAdmin, laserController.verCatalogo);
router.post("/laser/zonas/nueva", requireAdmin, laserController.crearZona);
router.post("/laser/zonas/:id/editar", requireAdmin, laserController.editarZona);
router.post("/laser/zonas/:id/eliminar", requireAdmin, laserController.eliminarZona);
router.post("/laser/combos/nuevo", requireAdmin, laserController.crearCombo);
router.post("/laser/combos/:id/editar", requireAdmin, laserController.editarCombo);
router.post("/laser/combos/:id/eliminar", requireAdmin, laserController.eliminarCombo);

// Clientas láser
router.get("/laser/clientas", requireAdmin, laserController.listarClientasLaser);
router.get("/laser/clientas/nueva", requireAdmin, laserController.showNuevaClientaLaserForm);
router.post("/laser/clientas/nueva", requireAdmin, laserController.storeClientaLaser);
router.get("/laser/clientas/exportar/excel", requireAdmin, laserController.exportarClientasLaserExcel);
router.post("/laser/clientas/importar/excel", requireAdmin, upload.single("archivo"), laserController.importarClientasLaserExcel);
router.get("/laser/clientas/:id/editar", requireAdmin, laserController.mostrarEditarClientaLaser);
router.post("/laser/clientas/:id/editar", requireAdmin, laserController.actualizarClientaLaser);
router.post("/laser/clientas/:id/eliminar", requireAdmin, laserController.eliminarClientaLaser);

// Días de trabajo
router.get("/laser/dias/nuevo", requireAdmin, laserController.showNuevoDiaForm);
router.post("/laser/dias/nuevo", requireAdmin, laserController.crearDia);
router.get("/laser/dias/:id", requireAdmin, laserController.verDia);
router.post("/laser/dias/:id/editar", requireAdmin, laserController.editarDia);
router.post("/laser/dias/:id/eliminar", requireAdmin, laserController.eliminarDia);

// Sesiones
router.post("/laser/dias/:id_dia/sesiones/nueva", requireAdmin, laserController.crearSesion);
router.post("/laser/sesiones/:id/editar", requireAdmin, laserController.editarSesion);
router.post("/laser/sesiones/:id/eliminar", requireAdmin, laserController.eliminarSesion);

// Gastos
router.post("/laser/dias/:id_dia/gastos/nuevo", requireAdmin, laserController.crearGasto);
router.post("/laser/gastos/:id/eliminar", requireAdmin, laserController.eliminarGasto);

// Historial clienta
router.get("/laser/clientas/:id/historial", requireAdmin, laserController.verHistorialClientaLaser);
router.post("/laser/clientas/:id/tratamiento", requireAdmin, laserController.actualizarTratamiento);

module.exports = router;
