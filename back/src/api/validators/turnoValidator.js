// FILE: src/api/validators/turnoValidator.js

/**
 * Valida que los campos obligatorios del turno estén presentes.
 * @returns {string|null} Mensaje de error o null si es válido
 */
const validarCamposObligatorios = ({
  fecha,
  hora,
  id_cliente,
  id_empleado,
  id_servicio,
}) => {
  if (!fecha || !hora || !id_cliente || !id_empleado || !id_servicio) {
    return "Completá todos los campos obligatorios.";
  }
  return null;
};

const validarHorario = (hora) => {
  if (!hora) return "La hora es obligatoria.";

  const [hh, mm] = hora.split(":").map(Number);

  if (isNaN(hh) || isNaN(mm)) return "Formato de hora inválido.";
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59)
    return "Formato de hora inválido.";
  if (mm % 30 !== 0)
    return "La hora debe ser en punto o y media (la agenda solo muestra turnos en esos horarios).";

  return null;
};

/**
 * Valida que la duración sea mayor a 0 y múltiplo de 30.
 * @param {number|string} duracion - En minutos
 * @returns {string|null}
 */
const validarDuracion = (duracion) => {
  const d = Number(duracion);

  if (isNaN(d) || d <= 0) return "La duración debe ser mayor a 0.";
  if (d % 30 !== 0) return "La duración debe ser múltiplo de 30 minutos.";

  return null;
};

/**
 * Valida que los montos sean consistentes.
 * @param {number|string} costo
 * @param {number|string} monto_abonado
 * @returns {string|null}
 */
const validarMontos = (costo, monto_abonado) => {
  const c = Number(costo || 0);
  const m = Number(monto_abonado || 0);

  if (c < 0) return "El costo no puede ser negativo.";
  if (m < 0) return "El monto abonado no puede ser negativo.";
  if (m > c) return "El monto abonado no puede superar el costo del servicio.";

  return null;
};

/**
 * Valida el método de pago elegido al cobrar un turno.
 * La validación es contra monto_abonado (lo cobrado en este momento), nunca
 * contra costo: un turno puede quedar parcialmente pagado sin problema.
 * @returns {string|null}
 */
const validarMetodoPago = ({
  metodo_pago,
  monto_efectivo,
  monto_transferencia,
  monto_abonado,
}) => {
  const abonado = Number(monto_abonado || 0);

  // Sin cobro (turno Pendiente): no corresponde pedir método de pago.
  if (abonado <= 0) return null;

  if (!metodo_pago) return "Seleccioná el método de pago.";

  const metodosValidos = ["efectivo", "transferencia", "mixto"];
  if (!metodosValidos.includes(metodo_pago)) {
    return "Método de pago inválido.";
  }

  if (metodo_pago === "mixto") {
    const efectivo = Number(monto_efectivo);
    const transferencia = Number(monto_transferencia);

    if (isNaN(efectivo) || isNaN(transferencia) || efectivo <= 0 || transferencia <= 0) {
      return "En pago mixto, ambos montos deben ser mayores a 0.";
    }

    if (Math.abs(efectivo + transferencia - abonado) > 0.01) {
      return "La suma de efectivo y transferencia debe ser igual al monto abonado.";
    }
  }

  return null;
};

module.exports = {
  validarCamposObligatorios,
  validarHorario,
  validarDuracion,
  validarMontos,
  validarMetodoPago,
};
