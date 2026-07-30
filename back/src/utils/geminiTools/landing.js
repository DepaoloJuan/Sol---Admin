const logger = require("../logger");
const landingModel = require("../../api/models/landingModel");

const resolverPorTexto = async (listaFn, campo, valor, etiqueta) => {
  const todos = await listaFn();
  const q = String(valor).toLowerCase();
  const candidatos = todos.filter((r) => String(r[campo] || "").toLowerCase().includes(q));

  if (candidatos.length === 0) {
    return { ok: false, mensaje: `No encontré ningún/a ${etiqueta} que coincida con "${valor}".` };
  }
  if (candidatos.length > 1) {
    const nombres = candidatos.map((c) => c[campo]).join(", ");
    return { ok: false, mensaje: `Hay más de un/a ${etiqueta} que coincide con "${valor}": ${nombres}. Pedile a Sol que sea más específica.` };
  }
  return { ok: true, entidad: candidatos[0] };
};

const AVISO_IMAGEN = " La imagen se tiene que cargar después a mano desde /landing, la voz no puede subir archivos.";

// ---------- Popup ----------

const consultarPopup = async () => {
  try {
    const popup = await landingModel.getPopup();
    if (!popup) return { ok: true, popup: null, mensaje: "No hay popup configurado." };
    return { ok: true, popup: { activo: popup.activo, texto: popup.texto } };
  } catch (error) {
    logger.error("asistente.consultarPopup.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar el popup." };
  }
};

const proponerActualizarPopup = async ({ activo, texto }) => {
  try {
    const cambios = [];
    if (activo !== undefined) cambios.push(`activo → ${activo}`);
    if (texto) cambios.push(`texto → "${texto}"`);
    if (cambios.length === 0) return { ok: false, mensaje: "No me dijiste qué cambiar del popup." };
    return {
      ok: true,
      confirmado: false,
      resumen: `Cambios propuestos en el popup: ${cambios.join(", ")}. Pedile confirmación explícita a Sol antes de llamar a confirmarActualizarPopup.`,
    };
  } catch (error) {
    logger.error("asistente.proponerActualizarPopup.failed", { error: error.message });
    return { ok: false, mensaje: "No pude armar el cambio del popup." };
  }
};

const confirmarActualizarPopup = async ({ activo, texto }) => {
  try {
    const actual = await landingModel.getPopup();
    await landingModel.updatePopup({
      activo: activo !== undefined ? activo : actual.activo,
      imagen_url: actual.imagen_url,
      imagen_url_fallback: actual.imagen_url_fallback,
      texto: texto || actual.texto,
    });
    return { ok: true, mensaje: "Popup actualizado." };
  } catch (error) {
    logger.error("asistente.confirmarActualizarPopup.failed", { error: error.message });
    return { ok: false, mensaje: "No pude actualizar el popup, avisale a Juanma." };
  }
};

// ---------- Servicios landing ----------

const consultarServiciosLanding = async ({ titulo }) => {
  try {
    const servicios = await landingModel.getAllServicios();
    const filtrados = titulo
      ? servicios.filter((s) => s.titulo.toLowerCase().includes(titulo.toLowerCase()))
      : servicios;
    return {
      ok: true,
      servicios: filtrados.map((s) => ({ titulo: s.titulo, descripcion: s.descripcion, activo: s.activo, orden: s.orden })),
    };
  } catch (error) {
    logger.error("asistente.consultarServiciosLanding.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar los servicios de la landing." };
  }
};

const proponerCrearServicioLanding = async ({ titulo, descripcion, orden }) => {
  return {
    ok: true,
    confirmado: false,
    resumen: `Nuevo servicio en la landing: "${titulo}", descripción "${descripcion || ""}".${AVISO_IMAGEN} Pedile confirmación explícita a Sol antes de llamar a confirmarCrearServicioLanding.`,
  };
};

const confirmarCrearServicioLanding = async ({ titulo, descripcion, orden }) => {
  try {
    await landingModel.createServicio({ titulo, descripcion, orden, activo: true });
    return { ok: true, mensaje: `Servicio "${titulo}" creado en la landing. Recordá cargarle una imagen a mano.` };
  } catch (error) {
    logger.error("asistente.confirmarCrearServicioLanding.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear el servicio de landing, avisale a Juanma." };
  }
};

const proponerEditarServicioLanding = async ({ titulo_actual, nuevo_titulo, nueva_descripcion, nuevo_orden, nuevo_activo }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllServicios, "titulo", titulo_actual, "servicio de landing");
    if (!resuelto.ok) return resuelto;

    const cambios = [];
    if (nuevo_titulo) cambios.push(`título → ${nuevo_titulo}`);
    if (nueva_descripcion) cambios.push(`descripción → ${nueva_descripcion}`);
    if (nuevo_orden !== undefined) cambios.push(`orden → ${nuevo_orden}`);
    if (nuevo_activo !== undefined) cambios.push(`activo → ${nuevo_activo}`);
    if (cambios.length === 0) return { ok: false, mensaje: "No me dijiste qué cambiar de ese servicio." };

    return {
      ok: true,
      confirmado: false,
      resumen: `Servicio "${resuelto.entidad.titulo}". Cambios propuestos: ${cambios.join(", ")}. Pedile confirmación explícita a Sol antes de llamar a confirmarEditarServicioLanding.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEditarServicioLanding.failed", { error: error.message });
    return { ok: false, mensaje: "No pude armar la edición del servicio." };
  }
};

const confirmarEditarServicioLanding = async ({ titulo_actual, nuevo_titulo, nueva_descripcion, nuevo_orden, nuevo_activo }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllServicios, "titulo", titulo_actual, "servicio de landing");
    if (!resuelto.ok) return resuelto;
    const actual = resuelto.entidad;

    await landingModel.updateServicio(actual.id, {
      titulo: nuevo_titulo || actual.titulo,
      descripcion: nueva_descripcion || actual.descripcion,
      orden: nuevo_orden !== undefined ? nuevo_orden : actual.orden,
      activo: nuevo_activo !== undefined ? nuevo_activo : actual.activo,
    });
    return { ok: true, mensaje: `Servicio "${actual.titulo}" actualizado.` };
  } catch (error) {
    logger.error("asistente.confirmarEditarServicioLanding.failed", { error: error.message });
    return { ok: false, mensaje: "No pude editar el servicio, avisale a Juanma." };
  }
};

const proponerEliminarServicioLanding = async ({ titulo }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllServicios, "titulo", titulo, "servicio de landing");
    if (!resuelto.ok) return resuelto;
    const imagenes = await landingModel.getImagenesServicio(resuelto.entidad.id);
    const aviso = imagenes.length > 0 ? ` OJO: tiene ${imagenes.length} imagen(es) cargada(s), que también se van a borrar.` : "";
    return {
      ok: true,
      confirmado: false,
      resumen: `Vas a eliminar el servicio de landing "${resuelto.entidad.titulo}".${aviso} Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarServicioLanding.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEliminarServicioLanding.failed", { error: error.message });
    return { ok: false, mensaje: "No pude buscar ese servicio." };
  }
};

const confirmarEliminarServicioLanding = async ({ titulo }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllServicios, "titulo", titulo, "servicio de landing");
    if (!resuelto.ok) return resuelto;
    await landingModel.deleteServicio(resuelto.entidad.id);
    return { ok: true, mensaje: `Servicio "${resuelto.entidad.titulo}" eliminado de la landing.` };
  } catch (error) {
    logger.error("asistente.confirmarEliminarServicioLanding.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar el servicio, avisale a Juanma." };
  }
};

// ---------- Imágenes de servicios landing ----------

const consultarImagenesServicioLanding = async ({ titulo_servicio }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllServicios, "titulo", titulo_servicio, "servicio de landing");
    if (!resuelto.ok) return resuelto;
    const imagenes = await landingModel.getImagenesServicio(resuelto.entidad.id);
    return {
      ok: true,
      imagenes: imagenes.map((img, i) => ({ indice: i + 1, orden: img.orden })),
    };
  } catch (error) {
    logger.error("asistente.consultarImagenesServicioLanding.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar las imágenes de ese servicio." };
  }
};

const proponerEliminarImagenServicio = async ({ titulo_servicio, indice }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllServicios, "titulo", titulo_servicio, "servicio de landing");
    if (!resuelto.ok) return resuelto;
    const imagenes = await landingModel.getImagenesServicio(resuelto.entidad.id);
    const img = imagenes[Number(indice) - 1];
    if (!img) return { ok: false, mensaje: `Ese servicio no tiene una imagen número ${indice}.` };
    return {
      ok: true,
      confirmado: false,
      resumen: `Vas a eliminar la imagen ${indice} del servicio "${resuelto.entidad.titulo}". Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarImagenServicio.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEliminarImagenServicio.failed", { error: error.message });
    return { ok: false, mensaje: "No pude buscar esa imagen." };
  }
};

const confirmarEliminarImagenServicio = async ({ titulo_servicio, indice }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllServicios, "titulo", titulo_servicio, "servicio de landing");
    if (!resuelto.ok) return resuelto;
    const imagenes = await landingModel.getImagenesServicio(resuelto.entidad.id);
    const img = imagenes[Number(indice) - 1];
    if (!img) return { ok: false, mensaje: `Ese servicio no tiene una imagen número ${indice}.` };
    await landingModel.deleteImagenServicio(img.id);
    return { ok: true, mensaje: `Imagen ${indice} de "${resuelto.entidad.titulo}" eliminada.` };
  } catch (error) {
    logger.error("asistente.confirmarEliminarImagenServicio.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar la imagen, avisale a Juanma." };
  }
};

// ---------- Cursos ----------

const consultarCursos = async ({ titulo }) => {
  try {
    const cursos = await landingModel.getAllCursos();
    const filtrados = titulo
      ? cursos.filter((c) => c.titulo.toLowerCase().includes(titulo.toLowerCase()))
      : cursos;
    return { ok: true, cursos: filtrados.map((c) => ({ titulo: c.titulo, descripcion: c.descripcion, activo: c.activo, orden: c.orden })) };
  } catch (error) {
    logger.error("asistente.consultarCursos.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar los cursos." };
  }
};

const proponerCrearCurso = async ({ titulo, descripcion, orden }) => {
  return {
    ok: true,
    confirmado: false,
    resumen: `Nuevo curso: "${titulo}", descripción "${descripcion || ""}".${AVISO_IMAGEN} Pedile confirmación explícita a Sol antes de llamar a confirmarCrearCurso.`,
  };
};

const confirmarCrearCurso = async ({ titulo, descripcion, orden }) => {
  try {
    await landingModel.createCurso({ titulo, descripcion, imagen_url: null, imagen_url_fallback: null, orden, activo: true });
    return { ok: true, mensaje: `Curso "${titulo}" creado. Recordá cargarle una imagen a mano.` };
  } catch (error) {
    logger.error("asistente.confirmarCrearCurso.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear el curso, avisale a Juanma." };
  }
};

const proponerEditarCurso = async ({ titulo_actual, nuevo_titulo, nueva_descripcion, nuevo_orden, nuevo_activo }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllCursos, "titulo", titulo_actual, "curso");
    if (!resuelto.ok) return resuelto;
    const cambios = [];
    if (nuevo_titulo) cambios.push(`título → ${nuevo_titulo}`);
    if (nueva_descripcion) cambios.push(`descripción → ${nueva_descripcion}`);
    if (nuevo_orden !== undefined) cambios.push(`orden → ${nuevo_orden}`);
    if (nuevo_activo !== undefined) cambios.push(`activo → ${nuevo_activo}`);
    if (cambios.length === 0) return { ok: false, mensaje: "No me dijiste qué cambiar de ese curso." };
    return {
      ok: true,
      confirmado: false,
      resumen: `Curso "${resuelto.entidad.titulo}". Cambios propuestos: ${cambios.join(", ")}. Pedile confirmación explícita a Sol antes de llamar a confirmarEditarCurso.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEditarCurso.failed", { error: error.message });
    return { ok: false, mensaje: "No pude armar la edición del curso." };
  }
};

const confirmarEditarCurso = async ({ titulo_actual, nuevo_titulo, nueva_descripcion, nuevo_orden, nuevo_activo }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllCursos, "titulo", titulo_actual, "curso");
    if (!resuelto.ok) return resuelto;
    const actual = resuelto.entidad;
    await landingModel.updateCurso(actual.id, {
      titulo: nuevo_titulo || actual.titulo,
      descripcion: nueva_descripcion || actual.descripcion,
      imagen_url: actual.imagen_url,
      imagen_url_fallback: actual.imagen_url_fallback,
      orden: nuevo_orden !== undefined ? nuevo_orden : actual.orden,
      activo: nuevo_activo !== undefined ? nuevo_activo : actual.activo,
    });
    return { ok: true, mensaje: `Curso "${actual.titulo}" actualizado.` };
  } catch (error) {
    logger.error("asistente.confirmarEditarCurso.failed", { error: error.message });
    return { ok: false, mensaje: "No pude editar el curso, avisale a Juanma." };
  }
};

const proponerEliminarCurso = async ({ titulo }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllCursos, "titulo", titulo, "curso");
    if (!resuelto.ok) return resuelto;
    return {
      ok: true,
      confirmado: false,
      resumen: `Vas a eliminar el curso "${resuelto.entidad.titulo}". Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarCurso.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEliminarCurso.failed", { error: error.message });
    return { ok: false, mensaje: "No pude buscar ese curso." };
  }
};

const confirmarEliminarCurso = async ({ titulo }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllCursos, "titulo", titulo, "curso");
    if (!resuelto.ok) return resuelto;
    await landingModel.deleteCurso(resuelto.entidad.id);
    return { ok: true, mensaje: `Curso "${resuelto.entidad.titulo}" eliminado.` };
  } catch (error) {
    logger.error("asistente.confirmarEliminarCurso.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar el curso, avisale a Juanma." };
  }
};

// ---------- Galería ----------

const consultarGaleria = async () => {
  try {
    const galeria = await landingModel.getAllGaleria();
    return { ok: true, imagenes: galeria.map((g, i) => ({ indice: i + 1, alt_texto: g.alt_texto, orden: g.orden })) };
  } catch (error) {
    logger.error("asistente.consultarGaleria.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar la galería." };
  }
};

const proponerEliminarImagenGaleria = async ({ indice }) => {
  try {
    const galeria = await landingModel.getAllGaleria();
    const img = galeria[Number(indice) - 1];
    if (!img) return { ok: false, mensaje: `No hay una imagen número ${indice} en la galería.` };
    return {
      ok: true,
      confirmado: false,
      resumen: `Vas a eliminar la imagen ${indice} de la galería${img.alt_texto ? ` ("${img.alt_texto}")` : ""}. Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarImagenGaleria.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEliminarImagenGaleria.failed", { error: error.message });
    return { ok: false, mensaje: "No pude buscar esa imagen." };
  }
};

const confirmarEliminarImagenGaleria = async ({ indice }) => {
  try {
    const galeria = await landingModel.getAllGaleria();
    const img = galeria[Number(indice) - 1];
    if (!img) return { ok: false, mensaje: `No hay una imagen número ${indice} en la galería.` };
    await landingModel.deleteImagenGaleria(img.id);
    return { ok: true, mensaje: `Imagen ${indice} de la galería eliminada.` };
  } catch (error) {
    logger.error("asistente.confirmarEliminarImagenGaleria.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar la imagen, avisale a Juanma." };
  }
};

// ---------- Testimonios ----------

const consultarTestimonios = async ({ nombre }) => {
  try {
    const testimonios = await landingModel.getAllTestimonios();
    const filtrados = nombre
      ? testimonios.filter((t) => t.nombre.toLowerCase().includes(nombre.toLowerCase()))
      : testimonios;
    return { ok: true, testimonios: filtrados.map((t) => ({ nombre: t.nombre, texto: t.texto, estrellas: t.estrellas, activo: t.activo })) };
  } catch (error) {
    logger.error("asistente.consultarTestimonios.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar los testimonios." };
  }
};

const proponerCrearTestimonio = async ({ nombre, texto, estrellas }) => {
  return {
    ok: true,
    confirmado: false,
    resumen: `Nuevo testimonio de "${nombre}": "${texto}", ${estrellas || 5} estrellas.${AVISO_IMAGEN.replace("La imagen", "La foto")} Pedile confirmación explícita a Sol antes de llamar a confirmarCrearTestimonio.`,
  };
};

const confirmarCrearTestimonio = async ({ nombre, texto, estrellas }) => {
  try {
    await landingModel.createTestimonio({ nombre, texto, estrellas, foto_url: null, foto_url_fallback: null, activo: true });
    return { ok: true, mensaje: `Testimonio de "${nombre}" creado. Recordá cargarle una foto a mano.` };
  } catch (error) {
    logger.error("asistente.confirmarCrearTestimonio.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear el testimonio, avisale a Juanma." };
  }
};

const proponerEditarTestimonio = async ({ nombre_actual, nuevo_texto, nuevas_estrellas, nuevo_activo }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllTestimonios, "nombre", nombre_actual, "testimonio");
    if (!resuelto.ok) return resuelto;
    const cambios = [];
    if (nuevo_texto) cambios.push(`texto → ${nuevo_texto}`);
    if (nuevas_estrellas !== undefined) cambios.push(`estrellas → ${nuevas_estrellas}`);
    if (nuevo_activo !== undefined) cambios.push(`activo → ${nuevo_activo}`);
    if (cambios.length === 0) return { ok: false, mensaje: "No me dijiste qué cambiar de ese testimonio." };
    return {
      ok: true,
      confirmado: false,
      resumen: `Testimonio de "${resuelto.entidad.nombre}". Cambios propuestos: ${cambios.join(", ")}. Pedile confirmación explícita a Sol antes de llamar a confirmarEditarTestimonio.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEditarTestimonio.failed", { error: error.message });
    return { ok: false, mensaje: "No pude armar la edición del testimonio." };
  }
};

const confirmarEditarTestimonio = async ({ nombre_actual, nuevo_texto, nuevas_estrellas, nuevo_activo }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllTestimonios, "nombre", nombre_actual, "testimonio");
    if (!resuelto.ok) return resuelto;
    const actual = resuelto.entidad;
    await landingModel.updateTestimonio(actual.id, {
      nombre: actual.nombre,
      texto: nuevo_texto || actual.texto,
      estrellas: nuevas_estrellas !== undefined ? nuevas_estrellas : actual.estrellas,
      foto_url: actual.foto_url,
      foto_url_fallback: actual.foto_url_fallback,
      activo: nuevo_activo !== undefined ? nuevo_activo : actual.activo,
      orden: actual.orden,
    });
    return { ok: true, mensaje: `Testimonio de "${actual.nombre}" actualizado.` };
  } catch (error) {
    logger.error("asistente.confirmarEditarTestimonio.failed", { error: error.message });
    return { ok: false, mensaje: "No pude editar el testimonio, avisale a Juanma." };
  }
};

const proponerEliminarTestimonio = async ({ nombre }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllTestimonios, "nombre", nombre, "testimonio");
    if (!resuelto.ok) return resuelto;
    return {
      ok: true,
      confirmado: false,
      resumen: `Vas a eliminar el testimonio de "${resuelto.entidad.nombre}". Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarTestimonio.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEliminarTestimonio.failed", { error: error.message });
    return { ok: false, mensaje: "No pude buscar ese testimonio." };
  }
};

const confirmarEliminarTestimonio = async ({ nombre }) => {
  try {
    const resuelto = await resolverPorTexto(landingModel.getAllTestimonios, "nombre", nombre, "testimonio");
    if (!resuelto.ok) return resuelto;
    await landingModel.deleteTestimonio(resuelto.entidad.id);
    return { ok: true, mensaje: `Testimonio de "${resuelto.entidad.nombre}" eliminado.` };
  } catch (error) {
    logger.error("asistente.confirmarEliminarTestimonio.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar el testimonio, avisale a Juanma." };
  }
};

// ---------- Declaraciones ----------

const S = { type: "STRING" };

const functionDeclarations = [
  { name: "consultarPopup", description: "Consulta el estado actual del popup promocional de la landing (solo lectura).", parameters: { type: "OBJECT", properties: {} } },
  { name: "proponerActualizarPopup", description: "Propone cambios de texto/activo del popup, sin imagen (eso se carga a mano). No guarda nada.", parameters: { type: "OBJECT", properties: { activo: { type: "BOOLEAN" }, texto: S } } },
  { name: "confirmarActualizarPopup", description: "Aplica de verdad los cambios del popup. NUNCA llamar sin confirmación verbal explícita de Sol.", parameters: { type: "OBJECT", properties: { activo: { type: "BOOLEAN" }, texto: S } } },

  { name: "consultarServiciosLanding", description: "Lista o busca servicios mostrados en la landing pública (solo lectura).", parameters: { type: "OBJECT", properties: { titulo: S } } },
  { name: "proponerCrearServicioLanding", description: "Propone un servicio nuevo para la landing (solo texto, sin imagen). No guarda nada.", parameters: { type: "OBJECT", properties: { titulo: S, descripcion: S, orden: { type: "INTEGER" } }, required: ["titulo"] } },
  { name: "confirmarCrearServicioLanding", description: "Crea de verdad el servicio de landing. NUNCA llamar sin confirmación verbal explícita de Sol.", parameters: { type: "OBJECT", properties: { titulo: S, descripcion: S, orden: { type: "INTEGER" } }, required: ["titulo"] } },
  { name: "proponerEditarServicioLanding", description: "Propone cambios de texto/orden/activo de un servicio de landing existente. No guarda nada.", parameters: { type: "OBJECT", properties: { titulo_actual: S, nuevo_titulo: S, nueva_descripcion: S, nuevo_orden: { type: "INTEGER" }, nuevo_activo: { type: "BOOLEAN" } }, required: ["titulo_actual"] } },
  { name: "confirmarEditarServicioLanding", description: "Aplica de verdad la edición. NUNCA llamar sin confirmación verbal explícita de Sol.", parameters: { type: "OBJECT", properties: { titulo_actual: S, nuevo_titulo: S, nueva_descripcion: S, nuevo_orden: { type: "INTEGER" }, nuevo_activo: { type: "BOOLEAN" } }, required: ["titulo_actual"] } },
  { name: "proponerEliminarServicioLanding", description: "Propone eliminar un servicio de landing, avisando si tiene imágenes asociadas. No borra nada.", parameters: { type: "OBJECT", properties: { titulo: S }, required: ["titulo"] } },
  { name: "confirmarEliminarServicioLanding", description: "Elimina de verdad el servicio de landing y sus imágenes. NUNCA llamar sin confirmación verbal explícita de Sol.", parameters: { type: "OBJECT", properties: { titulo: S }, required: ["titulo"] } },

  { name: "consultarImagenesServicioLanding", description: "Lista las imágenes de un servicio de landing, numeradas (solo lectura).", parameters: { type: "OBJECT", properties: { titulo_servicio: S }, required: ["titulo_servicio"] } },
  { name: "proponerEliminarImagenServicio", description: "Propone eliminar una imagen puntual (por número de índice) de un servicio de landing. No borra nada.", parameters: { type: "OBJECT", properties: { titulo_servicio: S, indice: { type: "INTEGER" } }, required: ["titulo_servicio", "indice"] } },
  { name: "confirmarEliminarImagenServicio", description: "Elimina de verdad esa imagen. NUNCA llamar sin confirmación verbal explícita de Sol.", parameters: { type: "OBJECT", properties: { titulo_servicio: S, indice: { type: "INTEGER" } }, required: ["titulo_servicio", "indice"] } },

  { name: "consultarCursos", description: "Lista o busca cursos/formaciones de la landing (solo lectura).", parameters: { type: "OBJECT", properties: { titulo: S } } },
  { name: "proponerCrearCurso", description: "Propone un curso nuevo (solo texto, sin imagen). No guarda nada.", parameters: { type: "OBJECT", properties: { titulo: S, descripcion: S, orden: { type: "INTEGER" } }, required: ["titulo"] } },
  { name: "confirmarCrearCurso", description: "Crea de verdad el curso. NUNCA llamar sin confirmación verbal explícita de Sol.", parameters: { type: "OBJECT", properties: { titulo: S, descripcion: S, orden: { type: "INTEGER" } }, required: ["titulo"] } },
  { name: "proponerEditarCurso", description: "Propone cambios de un curso existente. No guarda nada.", parameters: { type: "OBJECT", properties: { titulo_actual: S, nuevo_titulo: S, nueva_descripcion: S, nuevo_orden: { type: "INTEGER" }, nuevo_activo: { type: "BOOLEAN" } }, required: ["titulo_actual"] } },
  { name: "confirmarEditarCurso", description: "Aplica de verdad la edición del curso. NUNCA llamar sin confirmación verbal explícita de Sol.", parameters: { type: "OBJECT", properties: { titulo_actual: S, nuevo_titulo: S, nueva_descripcion: S, nuevo_orden: { type: "INTEGER" }, nuevo_activo: { type: "BOOLEAN" } }, required: ["titulo_actual"] } },
  { name: "proponerEliminarCurso", description: "Propone eliminar un curso. No borra nada.", parameters: { type: "OBJECT", properties: { titulo: S }, required: ["titulo"] } },
  { name: "confirmarEliminarCurso", description: "Elimina de verdad el curso. NUNCA llamar sin confirmación verbal explícita de Sol.", parameters: { type: "OBJECT", properties: { titulo: S }, required: ["titulo"] } },

  { name: "consultarGaleria", description: "Lista las imágenes de la galería de la landing, numeradas (solo lectura).", parameters: { type: "OBJECT", properties: {} } },
  { name: "proponerEliminarImagenGaleria", description: "Propone eliminar una imagen de la galería por número de índice. No borra nada.", parameters: { type: "OBJECT", properties: { indice: { type: "INTEGER" } }, required: ["indice"] } },
  { name: "confirmarEliminarImagenGaleria", description: "Elimina de verdad esa imagen de la galería. NUNCA llamar sin confirmación verbal explícita de Sol.", parameters: { type: "OBJECT", properties: { indice: { type: "INTEGER" } }, required: ["indice"] } },

  { name: "consultarTestimonios", description: "Lista o busca testimonios de clientas en la landing (solo lectura).", parameters: { type: "OBJECT", properties: { nombre: S } } },
  { name: "proponerCrearTestimonio", description: "Propone un testimonio nuevo (solo texto, sin foto). No guarda nada.", parameters: { type: "OBJECT", properties: { nombre: S, texto: S, estrellas: { type: "INTEGER" } }, required: ["nombre", "texto"] } },
  { name: "confirmarCrearTestimonio", description: "Crea de verdad el testimonio. NUNCA llamar sin confirmación verbal explícita de Sol.", parameters: { type: "OBJECT", properties: { nombre: S, texto: S, estrellas: { type: "INTEGER" } }, required: ["nombre", "texto"] } },
  { name: "proponerEditarTestimonio", description: "Propone cambios de un testimonio existente. No guarda nada.", parameters: { type: "OBJECT", properties: { nombre_actual: S, nuevo_texto: S, nuevas_estrellas: { type: "INTEGER" }, nuevo_activo: { type: "BOOLEAN" } }, required: ["nombre_actual"] } },
  { name: "confirmarEditarTestimonio", description: "Aplica de verdad la edición del testimonio. NUNCA llamar sin confirmación verbal explícita de Sol.", parameters: { type: "OBJECT", properties: { nombre_actual: S, nuevo_texto: S, nuevas_estrellas: { type: "INTEGER" }, nuevo_activo: { type: "BOOLEAN" } }, required: ["nombre_actual"] } },
  { name: "proponerEliminarTestimonio", description: "Propone eliminar un testimonio. No borra nada.", parameters: { type: "OBJECT", properties: { nombre: S }, required: ["nombre"] } },
  { name: "confirmarEliminarTestimonio", description: "Elimina de verdad el testimonio. NUNCA llamar sin confirmación verbal explícita de Sol.", parameters: { type: "OBJECT", properties: { nombre: S }, required: ["nombre"] } },
];

const ejecutar = async (nombre, args) => {
  switch (nombre) {
    case "consultarPopup": return consultarPopup(args);
    case "proponerActualizarPopup": return proponerActualizarPopup(args);
    case "confirmarActualizarPopup": return confirmarActualizarPopup(args);
    case "consultarServiciosLanding": return consultarServiciosLanding(args);
    case "proponerCrearServicioLanding": return proponerCrearServicioLanding(args);
    case "confirmarCrearServicioLanding": return confirmarCrearServicioLanding(args);
    case "proponerEditarServicioLanding": return proponerEditarServicioLanding(args);
    case "confirmarEditarServicioLanding": return confirmarEditarServicioLanding(args);
    case "proponerEliminarServicioLanding": return proponerEliminarServicioLanding(args);
    case "confirmarEliminarServicioLanding": return confirmarEliminarServicioLanding(args);
    case "consultarImagenesServicioLanding": return consultarImagenesServicioLanding(args);
    case "proponerEliminarImagenServicio": return proponerEliminarImagenServicio(args);
    case "confirmarEliminarImagenServicio": return confirmarEliminarImagenServicio(args);
    case "consultarCursos": return consultarCursos(args);
    case "proponerCrearCurso": return proponerCrearCurso(args);
    case "confirmarCrearCurso": return confirmarCrearCurso(args);
    case "proponerEditarCurso": return proponerEditarCurso(args);
    case "confirmarEditarCurso": return confirmarEditarCurso(args);
    case "proponerEliminarCurso": return proponerEliminarCurso(args);
    case "confirmarEliminarCurso": return confirmarEliminarCurso(args);
    case "consultarGaleria": return consultarGaleria(args);
    case "proponerEliminarImagenGaleria": return proponerEliminarImagenGaleria(args);
    case "confirmarEliminarImagenGaleria": return confirmarEliminarImagenGaleria(args);
    case "consultarTestimonios": return consultarTestimonios(args);
    case "proponerCrearTestimonio": return proponerCrearTestimonio(args);
    case "confirmarCrearTestimonio": return confirmarCrearTestimonio(args);
    case "proponerEditarTestimonio": return proponerEditarTestimonio(args);
    case "confirmarEditarTestimonio": return confirmarEditarTestimonio(args);
    case "proponerEliminarTestimonio": return proponerEliminarTestimonio(args);
    case "confirmarEliminarTestimonio": return confirmarEliminarTestimonio(args);
    default: return null;
  }
};

const systemInstructionFragment =
  "Para el CMS de la landing (popup, servicios, cursos, galería, testimonios): la voz NUNCA puede subir imágenes o fotos, esa parte SIEMPRE se hace después a mano desde /landing — avisale esto a Sol cuando cree o edite algo que normalmente llevaría imagen. Usá siempre primero la herramienta 'proponer...', leele el resumen completo a Sol, y SOLO después de una confirmación verbal explícita e inequívoca llamá a la 'confirmar...' correspondiente. Eliminar cualquier cosa de la landing no se puede deshacer.";

module.exports = { functionDeclarations, ejecutar, systemInstructionFragment };
