// FILE: src/api/routes/landingRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { requireAuth } = require("../middlewares/authMiddleware");
const landingController = require("../controllers/landingController");

// =============================================
// PANEL PRINCIPAL
// =============================================

router.get("/landing", requireAuth, landingController.verPanel);

// =============================================
// POPUP
// =============================================

router.post(
  "/landing/popup/editar",
  requireAuth,
  upload.single("imagen"),
  landingController.actualizarPopup,
);
router.post("/landing/popup/limpiar", requireAuth, landingController.limpiarPopup);

// =============================================
// SERVICIOS
// =============================================

router.get(
  "/landing/servicios/nuevo",
  requireAuth,
  landingController.verNuevoServicio,
);
router.post(
  "/landing/servicios/nuevo",
  requireAuth,
  upload.single("imagen"),
  landingController.crearServicio,
);

router.get(
  "/landing/servicios/:id/editar",
  requireAuth,
  landingController.verEditarServicio,
);
router.post(
  "/landing/servicios/:id/editar",
  requireAuth,
  upload.single("imagen"),
  landingController.actualizarServicio,
);

router.post(
  "/landing/servicios/:id/eliminar",
  requireAuth,
  landingController.eliminarServicio,
);
router.post(
  "/landing/servicios/imagenes/:id/eliminar",
  requireAuth,
  landingController.eliminarImagenServicio,
);

// =============================================
// CURSOS
// =============================================

router.get(
  "/landing/cursos/nuevo",
  requireAuth,
  landingController.verNuevoCurso,
);
router.post(
  "/landing/cursos/nuevo",
  requireAuth,
  upload.single("imagen"),
  landingController.crearCurso,
);

router.get(
  "/landing/cursos/:id/editar",
  requireAuth,
  landingController.verEditarCurso,
);
router.post(
  "/landing/cursos/:id/editar",
  requireAuth,
  upload.single("imagen"),
  landingController.actualizarCurso,
);

router.post(
  "/landing/cursos/:id/eliminar",
  requireAuth,
  landingController.eliminarCurso,
);

// =============================================
// GALERÍA
// =============================================

router.post(
  "/landing/galeria/agregar",
  requireAuth,
  upload.single("imagen"),
  landingController.agregarImagenGaleria,
);

router.post(
  "/landing/galeria/:id/eliminar",
  requireAuth,
  landingController.eliminarImagenGaleria,
);

// =============================================
// TESTIMONIOS
// =============================================

router.get(
  "/landing/testimonios/nuevo",
  requireAuth,
  landingController.verNuevoTestimonio,
);
router.post(
  "/landing/testimonios/nuevo",
  requireAuth,
  upload.single("foto"),
  landingController.crearTestimonio,
);

router.get(
  "/landing/testimonios/:id/editar",
  requireAuth,
  landingController.verEditarTestimonio,
);
router.post(
  "/landing/testimonios/:id/editar",
  requireAuth,
  upload.single("foto"),
  landingController.actualizarTestimonio,
);

router.post(
  "/landing/testimonios/:id/eliminar",
  requireAuth,
  landingController.eliminarTestimonio,
);

module.exports = router;
