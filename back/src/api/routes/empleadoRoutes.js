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

const { requireAuth } = require("../middlewares/authMiddleware");

router.get("/empleados", requireAuth, listarEmpleados);

router.get("/empleados/nuevo", requireAuth, mostrarNuevaEmpleada);
router.post("/empleados/nuevo", requireAuth, crearEmpleada);
router.get("/empleados/:id/editar", requireAuth, mostrarEditarEmpleada);
router.post("/empleados/:id/editar", requireAuth, actualizarEmpleada);
router.post("/empleados/:id/eliminar", requireAuth, eliminarEmpleada);
router.get("/empleados/:id", requireAuth, verPerfilEmpleada);

module.exports = router;
