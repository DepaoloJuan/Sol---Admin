const crypto = require("crypto");
const clienteModel = require("../api/models/clienteModel");
const fidelidadModel = require("../api/models/fidelidadModel");
const turnoModel = require("../api/models/turnoModel");

const TOTAL_SELLOS_POR_CICLO = 10;

// Sesión deslizante: cada request autenticado la renueva otra hora más
// (ver clientaMiddleware). Una cuenta activa nunca se desloguea sola; una
// sesión robada e inactiva muere en como mucho 1h.
const TOKEN_DURACION_MS = 1000 * 60 * 60;

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
 * Otorga un sello si el turno acaba de pasar a "Pagado" (y antes no lo estaba),
 * su clienta tiene una cuenta de fidelización vinculada, el turno cae dentro
 * de la ventana habilitada por Sol (fecha_inicio) y el servicio prestado
 * cuenta para el programa (lista blanca). Nunca tira: los 4 call-sites que la
 * usan (creación/edición de turno por UI y por el asistente) no deben
 * romperse si algo falla acá — es responsabilidad del caller loguear.
 */
const MAX_INTENTOS_SELLO = 5;

/**
 * fidelidad_sellos tiene dos UNIQUE distintos: (id_turno) para idempotencia
 * normal, y (id_cuenta, ciclo, numero_sello) para que dos turnos de la MISMA
 * clienta marcados "Pagado" casi al mismo tiempo no terminen con el mismo
 * número de sello (el conteo se lee y se inserta sin lock). Si choca contra
 * el segundo, se recalcula el conteo y se reintenta — si choca contra el
 * primero, es la idempotencia normal y no hay nada más que hacer.
 *
 * Al otorgar el sello número 1 de un ciclo se congela un snapshot de las
 * reglas de premio vigentes en ese momento (fidelidad_reglas_ciclo): así, si
 * Sol edita las reglas a mitad de una tarjeta, el cambio no le pisa la
 * tarjeta a nadie que ya la tenga en curso — sólo aplica a la próxima.
 */
const otorgarSelloCore = async (cuenta, turno) => {
  for (let intento = 1; intento <= MAX_INTENTOS_SELLO; intento++) {
    const ciclo = await fidelidadModel.getCicloActual(cuenta.id);
    const sellosDelCiclo = await fidelidadModel.contarSellosDelCiclo(cuenta.id, ciclo);

    let cicloDestino = ciclo;
    let numeroSello = sellosDelCiclo + 1;
    if (numeroSello > TOTAL_SELLOS_POR_CICLO) {
      cicloDestino = ciclo + 1;
      numeroSello = 1;
    }

    let sello;
    try {
      sello = await fidelidadModel.otorgarSello(cuenta.id, turno.id, numeroSello, cicloDestino);
    } catch (error) {
      if (error.code === "23505" && intento < MAX_INTENTOS_SELLO) continue;
      throw error;
    }

    if (!sello) return null; // ya existía (turno editado más de una vez estando Pagado)

    if (numeroSello === 1) {
      await fidelidadModel.snapshotearReglasCiclo(cuenta.id, cicloDestino);
    }

    const reglas = await fidelidadModel.getReglasCiclo(cuenta.id, cicloDestino);
    const hayPremioEnEsteSello = reglas.some((r) => r.numero_sello === numeroSello);
    if (hayPremioEnEsteSello) {
      await fidelidadModel.crearPremioPendiente(cuenta.id, cicloDestino, numeroSello);
    }

    return sello;
  }

  return null;
};

const otorgarSelloSiCorresponde = async (turno, estadoAnterior) => {
  if (turno.estado !== "Pagado" || estadoAnterior === "Pagado") return null;
  if (!turno.id_cliente) return null;

  const cuenta = await fidelidadModel.getCuentaVinculadaPorCliente(turno.id_cliente);
  if (!cuenta) return null;

  // fecha_inicio compara contra la fecha del SERVICIO, no la del pago: así una
  // clienta que paga hoy turnos atrasados de antes del lanzamiento no suma.
  const dentroDeVentana = await fidelidadModel.fechaDentroDeVentanaFidelidad(turno.fecha);
  if (!dentroDeVentana) return null;

  const habilitado = await fidelidadModel.servicioEstaHabilitado(turno.id_servicio);
  if (!habilitado) return null;

  return otorgarSelloCore(cuenta, turno);
};

/**
 * Otorgamiento manual, para cuando a Sol o la secretaria se les pasó un turno
 * que en verdad debía sumar (ej. el servicio todavía no estaba en la lista
 * habilitada cuando se pagó). A diferencia de la ruta automática, esta NO
 * chequea fecha_inicio ni la lista de servicios habilitados — es una
 * decisión humana explícita que saltea esos gates a propósito.
 */
const otorgarSelloManual = async (idTurno) => {
  const turno = await turnoModel.getTurnoById(idTurno);
  if (!turno) {
    throw new Error("El turno no existe.");
  }
  if (turno.estado !== "Pagado") {
    throw new Error("El turno no está pagado.");
  }

  const cuenta = await fidelidadModel.getCuentaVinculadaPorCliente(turno.id_cliente);
  if (!cuenta) {
    throw new Error("La clienta no está vinculada a fidelización.");
  }

  const yaTiene = await fidelidadModel.getSelloPorTurno(idTurno);
  if (yaTiene) {
    throw new Error("Este turno ya sumó un sello.");
  }

  return otorgarSelloCore(cuenta, turno);
};

module.exports = {
  TOTAL_SELLOS_POR_CICLO,
  TOKEN_DURACION_MS,
  normalizarTelefono,
  normalizarNombre,
  resolverVinculacion,
  generarTokenSesion,
  sortearPremio,
  otorgarSelloSiCorresponde,
  otorgarSelloManual,
};
