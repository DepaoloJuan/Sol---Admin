const resolverUnico = async (searchFn, nombre, etiqueta) => {
  const resultados = await searchFn(nombre);
  if (resultados.length === 0) {
    return { ok: false, mensaje: `No encontré ningún/a ${etiqueta} llamado/a "${nombre}".` };
  }
  if (resultados.length > 1) {
    const nombres = resultados
      .map((r) => `${r.nombre || r.descripcion} ${r.apellido || ""}`.trim())
      .join(", ");
    return { ok: false, mensaje: `Hay más de un/a ${etiqueta} que coincide con "${nombre}": ${nombres}. Pedile a Sol que sea más específica.` };
  }
  return { ok: true, entidad: resultados[0] };
};

// Convierte una fecha (columna DATE de Postgres) a "YYYY-MM-DD" sin
// reinterpretarla por zona horaria. dateHelpers.formatDate NO sirve acá:
// está pensado para "hoy en Argentina" a partir de un new Date() real, y
// aplicado a una fecha de DB corre el riesgo de mostrar el día anterior
// si el server no corre en horario de Argentina (ej. UTC en Render).
const fechaDB = (fecha) => new Date(fecha).toISOString().slice(0, 10);

module.exports = { resolverUnico, fechaDB };
