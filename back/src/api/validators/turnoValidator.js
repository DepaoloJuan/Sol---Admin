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

module.exports = {
  validarCamposObligatorios,
  validarHorario,
  validarDuracion,
  validarMontos,
};
