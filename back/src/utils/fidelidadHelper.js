const crypto = require("crypto");
const clienteModel = require("../api/models/clienteModel");
const fidelidadModel = require("../api/models/fidelidadModel");

const TOTAL_SELLOS_POR_CICLO = 10;

const normalizarTelefono = (raw) => {
  if (!raw) return null;
  const digitos = String(raw).replace(/\D/g, "");
  if (digitos.length < 8) return null;
  return digitos.slice(-8);
};

const normalizarNombre = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/**
 * Resuelve la vinculación de una cuenta de landing con una fila de `clientes`
 * a partir del teléfono ingresado. Ver docs/ai/TASKS.md para el detalle del
 * algoritmo y por qué hace falta el paso de desambiguación por nombre (hay
 * colisiones reales de últimos-8-dígitos en la base, algunas por clientas
 * distintas y otras por filas duplicadas de la misma persona).
 */
const resolverVinculacion = async (telefonoIngresado, nombreGoogle) => {
  const normalizado = normalizarTelefono(telefonoIngresado);
  if (!normalizado) {
    return { estado: "pendiente" };
  }

  const candidatos = await clienteModel.buscarPorTelefonoNormalizado(normalizado);

  if (candidatos.length === 1) {
    return { estado: "auto", idCliente: candidatos[0].id };
  }

  if (candidatos.length > 1 && nombreGoogle) {
    const nombreNorm = normalizarNombre(nombreGoogle);
    const porNombre = candidatos.filter((c) => {
      const nombreCompleto = normalizarNombre(`${c.nombre || ""} ${c.apellido || ""}`);
      return nombreCompleto && (nombreCompleto.includes(nombreNorm) || nombreNorm.includes(nombreCompleto));
    });
    if (porNombre.length === 1) {
      return { estado: "auto", idCliente: porNombre[0].id };
    }
  }

  return { estado: "pendiente" };
};

const generarTokenSesion = () => crypto.randomBytes(32).toString("hex");

// Sorteo ponderado contra el catálogo editable desde /fidelidad/premios
// (solo premios activos). Si Sol vacía el catálogo por completo, devuelve
// null — el caller decide qué hacer (no debería poder pasar en la práctica,
// pero no hay que asumirlo).
const sortearPremio = async () => {
  const catalogo = await fidelidadModel.getCatalogoActivo();
  if (catalogo.length === 0) return null;

  const pesoTotal = catalogo.reduce((acc, p) => acc + p.peso, 0);
  let punto = Math.random() * pesoTotal;
  for (const premio of catalogo) {
    punto -= premio.peso;
    if (punto <= 0) return { tipo: String(premio.id), descripcion: premio.descripcion };
  }
  const ultimo = catalogo[catalogo.length - 1];
  return { tipo: String(ultimo.id), descripcion: ultimo.descripcion };
};

/**
 * Otorga un sello si el turno acaba de pasar a "Pagado" (y antes no lo estaba)
 * y su clienta tiene una cuenta de fidelización vinculada. Nunca tira: los 4
 * call-sites que la usan (creación/edición de turno por UI y por el asistente)
 * no deben romperse si algo falla acá — es responsabilidad del caller loguear.
 */
const otorgarSelloSiCorresponde = async (turno, estadoAnterior) => {
  if (turno.estado !== "Pagado" || estadoAnterior === "Pagado") return null;
  if (!turno.id_cliente) return null;

  const cuenta = await fidelidadModel.getCuentaVinculadaPorCliente(turno.id_cliente);
  if (!cuenta) return null;

  const ciclo = await fidelidadModel.getCicloActual(cuenta.id);
  const sellosDelCiclo = await fidelidadModel.contarSellosDelCiclo(cuenta.id, ciclo);

  let cicloDestino = ciclo;
  let numeroSello = sellosDelCiclo + 1;
  if (numeroSello > TOTAL_SELLOS_POR_CICLO) {
    cicloDestino = ciclo + 1;
    numeroSello = 1;
  }

  const sello = await fidelidadModel.otorgarSello(cuenta.id, turno.id, numeroSello, cicloDestino);
  if (!sello) return null; // ya existía (turno editado más de una vez estando Pagado)

  const reglas = await fidelidadModel.getReglasPremio();
  const hayPremioEnEsteSello = reglas.some((r) => r.numero_sello === numeroSello);
  if (hayPremioEnEsteSello) {
    await fidelidadModel.crearPremioPendiente(cuenta.id, cicloDestino, numeroSello);
  }

  return sello;
};

module.exports = {
  TOTAL_SELLOS_POR_CICLO,
  normalizarTelefono,
  normalizarNombre,
  resolverVinculacion,
  generarTokenSesion,
  sortearPremio,
  otorgarSelloSiCorresponde,
};
