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

module.exports = { resolverUnico };
