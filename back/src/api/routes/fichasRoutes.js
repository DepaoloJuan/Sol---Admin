const express = require("express");
const router = express.Router();

const {
  listarFichasLifting,
  showNuevaFichaLiftingForm,
  crearFichaLifting,
  mostrarEditarFichaLifting,
  actualizarFichaLifting,
  eliminarFichaLifting,
} = require("../controllers/fichaLiftingController");

const {
  listarFichasExtensiones,
  showNuevaFichaExtensionesForm,
  crearFichaExtensiones,
  mostrarEditarFichaExtensiones,
  actualizarFichaExtensiones,
  eliminarFichaExtensiones,
} = require("../controllers/fichaExtensionesController");

const { buscarClientesJson, crearClienteRapido } = require("../controllers/clienteController");

const { requireAdminOMili } = require("../middlewares/authMiddleware");

router.get("/mis-fichas/buscar-clienta", requireAdminOMili, buscarClientesJson);
router.post("/mis-fichas/clientes/nueva-rapida", requireAdminOMili, crearClienteRapido);

router.get("/mis-fichas/lifting", requireAdminOMili, listarFichasLifting);
router.get("/mis-fichas/lifting/nuevo", requireAdminOMili, showNuevaFichaLiftingForm);
router.post("/mis-fichas/lifting/nuevo", requireAdminOMili, crearFichaLifting);
router.get("/mis-fichas/lifting/:id/editar", requireAdminOMili, mostrarEditarFichaLifting);
router.post("/mis-fichas/lifting/:id/editar", requireAdminOMili, actualizarFichaLifting);
router.post("/mis-fichas/lifting/:id/eliminar", requireAdminOMili, eliminarFichaLifting);

router.get("/mis-fichas/extensiones", requireAdminOMili, listarFichasExtensiones);
router.get("/mis-fichas/extensiones/nuevo", requireAdminOMili, showNuevaFichaExtensionesForm);
router.post("/mis-fichas/extensiones/nuevo", requireAdminOMili, crearFichaExtensiones);
router.get("/mis-fichas/extensiones/:id/editar", requireAdminOMili, mostrarEditarFichaExtensiones);
router.post("/mis-fichas/extensiones/:id/editar", requireAdminOMili, actualizarFichaExtensiones);
router.post("/mis-fichas/extensiones/:id/eliminar", requireAdminOMili, eliminarFichaExtensiones);

module.exports = router;
