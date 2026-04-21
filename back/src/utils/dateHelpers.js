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

module.exports = { formatDate };
