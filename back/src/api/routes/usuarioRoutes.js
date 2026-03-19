const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");
const { requireAdmin } = require("../middlewares/authMiddleware");

router.get("/usuarios", requireAdmin, usuarioController.listarUsuarios);
router.post("/usuarios/nuevo", requireAdmin, usuarioController.crearUsuario);
router.post(
  "/usuarios/:id/eliminar",
  requireAdmin,
  usuarioController.eliminarUsuario,
);
router.post(
  "/usuarios/:id/password",
  requireAdmin,
  usuarioController.actualizarPassword,
);

module.exports = router;
