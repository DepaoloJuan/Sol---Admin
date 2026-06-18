// FILE: src/api/routes/landingApiRoutes.js
const express = require("express");
const router = express.Router();
const landingModel = require("../models/landingModel");
const logger = require("../../utils/logger");

// GET /api/landing/popup
router.get("/popup", async (req, res) => {
  try {
    const popup = await landingModel.getPopup();
    res.json(popup);
  } catch (error) {
    logger.error("api.landing.popup.failed", { error: error.message });
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/landing/servicios
router.get("/servicios", async (req, res) => {
  try {
    const servicios = await landingModel.getAllServicios();
    const activos = servicios.filter((s) => s.activo);

    // Para cada servicio traemos sus imágenes
    const conImagenes = await Promise.all(
      activos.map(async (s) => {
        const imagenes = await landingModel.getImagenesServicio(s.id);
        return { ...s, imagenes };
      }),
    );

    res.json(conImagenes);
  } catch (error) {
    logger.error("api.landing.servicios.failed", { error: error.message });
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/landing/cursos
router.get("/cursos", async (req, res) => {
  try {
    const cursos = await landingModel.getAllCursos();
    res.json(cursos.filter((c) => c.activo));
  } catch (error) {
    logger.error("api.landing.cursos.failed", { error: error.message });
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/landing/galeria
router.get("/galeria", async (req, res) => {
  try {
    const galeria = await landingModel.getAllGaleria();
    res.json(galeria);
  } catch (error) {
    logger.error("api.landing.galeria.failed", { error: error.message });
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/landing/testimonios
router.get("/testimonios", async (req, res) => {
  try {
    const testimonios = await landingModel.getAllTestimonios();
    res.json(testimonios.filter((t) => t.activo));
  } catch (error) {
    logger.error("api.landing.testimonios.failed", { error: error.message });
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
