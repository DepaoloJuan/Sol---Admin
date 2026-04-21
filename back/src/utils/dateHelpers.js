/**
 * Formatea un objeto Date a string YYYY-MM-DD
 * usando el timezone de Argentina para evitar desfases UTC.
 * Usa en-CA porque ese locale garantiza el formato YYYY-MM-DD sin parseo adicional.
 *
 * @param {Date} fecha
 * @returns {string} "YYYY-MM-DD"
 */
const formatDate = (fecha) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
};

const calcularMetricas = (lista) => {
  const totalTurnos = lista.length;
  const totalMinutos = lista.reduce(
    (acc, t) => acc + Number(t.duracion || 0),
    0,
  );
  const horasTrabajadas = (totalMinutos / 60).toFixed(1);
  const facturacionTotal = lista.reduce(
    (acc, t) => acc + Number(t.costo || 0),
    0,
  );
  const comisionEstimada = lista.reduce(
    (acc, t) =>
      acc + Number(t.costo || 0) * (Number(t.porcentaje_ganancia || 0) / 100),
    0,
  );
  const totalPropinas = lista.reduce(
    (acc, t) => acc + Number(t.propina || 0),
    0,
  );
  return {
    totalTurnos,
    horasTrabajadas,
    facturacionTotal,
    comisionEstimada,
    totalPropinas,
  };
};

module.exports = { formatDate, calcularMetricas };
