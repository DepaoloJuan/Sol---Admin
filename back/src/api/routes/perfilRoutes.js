const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const {
  mostrarPerfil,
  actualizarFoto,
  eliminarFoto,
  actualizarTitulo,
  actualizarPasswordPropia,
} = require("../controllers/perfilController");

const { requireAuth } = require("../middlewares/authMiddleware");

router.get("/mi-perfil", requireAuth, mostrarPerfil);
router.post("/mi-perfil/foto", requireAuth, upload.single("foto"), actualizarFoto);
router.post("/mi-perfil/foto/eliminar", requireAuth, eliminarFoto);
router.post("/mi-perfil/titulo", requireAuth, actualizarTitulo);
router.post("/mi-perfil/password", requireAuth, actualizarPasswordPropia);

module.exports = router;
