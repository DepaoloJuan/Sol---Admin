const express = require("express");
const router = express.Router();

const {
  listarEmpleados,
  mostrarNuevaEmpleada,
  crearEmpleada,
  mostrarEditarEmpleada,
  actualizarEmpleada,
  eliminarEmpleada,
  verPerfilEmpleada,
} = require("../controllers/empleadoController");

const { requireAdmin } = require("../middlewares/authMiddleware");

router.get("/empleados", requireAdmin, listarEmpleados);

router.get("/empleados/nuevo", requireAdmin, mostrarNuevaEmpleada);
router.post("/empleados/nuevo", requireAdmin, crearEmpleada);
router.get("/empleados/:id/editar", requireAdmin, mostrarEditarEmpleada);
router.post("/empleados/:id/editar", requireAdmin, actualizarEmpleada);
router.post("/empleados/:id/eliminar", requireAdmin, eliminarEmpleada);
router.get("/empleados/:id/perfil", requireAdmin, verPerfilEmpleada);

module.exports = router;
