const pool = require("../../api/database/db");
const logger = require("../logger");
const servicioModel = require("../../api/models/servicioModel");
const { resolverUnico } = require("./_shared");

const contarTurnosDeServicio = async (idServicio) => {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS total FROM public.turnos WHERE id_servicio = $1",
    [idServicio],
  );
  return rows[0].total;
};

const consultarServicios = async ({ nombre }) => {
  try {
    const servicios = nombre
      ? await servicioModel.searchServicios(nombre)
      : await servicioModel.getAllServicios();
    return {
      ok: true,
      servicios: servicios.map((s) => ({
        descripcion: s.descripcion,
        precio: Number(s.precio || 0),
        duracion_sugerida: s.duracion_sugerida,
      })),
    };
  } catch (error) {
    logger.error("asistente.consultarServicios.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar servicios, intentá de nuevo." };
  }
};

const proponerCrearServicio = async ({ descripcion, precio, duracion_sugerida }) => {
  return {
    ok: true,
    confirmado: false,
    resumen: `Nuevo servicio: "${descripcion}", precio $${precio || 0}, duración sugerida ${duracion_sugerida || 30} minutos. Pedile confirmación explícita a Sol antes de llamar a confirmarCrearServicio.`,
  };
};

const confirmarCrearServicio = async ({ descripcion, precio, duracion_sugerida }) => {
  try {
    const servicio = await servicioModel.createServicio({ descripcion, precio, duracion_sugerida });
    return { ok: true, mensaje: `Servicio "${servicio.descripcion}" creado.` };
  } catch (error) {
    logger.error("asistente.confirmarCrearServicio.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear el servicio, avisale a Juanma." };
  }
};

const proponerEditarServicio = async ({ nombre_actual, nueva_descripcion, nuevo_precio, nueva_duracion }) => {
  try {
    const resuelto = await resolverUnico(servicioModel.searchServicios, nombre_actual, "servicio");
    if (!resuelto.ok) return resuelto;

    const cambios = [];
    if (nueva_descripcion) cambios.push(`nombre → ${nueva_descripcion}`);
    if (nuevo_precio) cambios.push(`precio → $${nuevo_precio}`);
    if (nueva_duracion) cambios.push(`duración → ${nueva_duracion} minutos`);
    if (cambios.length === 0) {
      return { ok: false, mensaje: "No me dijiste qué cambiar de ese servicio." };
    }

    return {
      ok: true,
      confirmado: false,
      resumen: `Servicio "${resuelto.entidad.descripcion}". Cambios propuestos: ${cambios.join(", ")}. Pedile confirmación explícita a Sol antes de llamar a confirmarEditarServicio.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEditarServicio.failed", { error: error.message });
    return { ok: false, mensaje: "No pude armar la edición del servicio, intentá de nuevo." };
  }
};

const confirmarEditarServicio = async ({ nombre_actual, nueva_descripcion, nuevo_precio, nueva_duracion }) => {
  try {
    const resuelto = await resolverUnico(servicioModel.searchServicios, nombre_actual, "servicio");
    if (!resuelto.ok) return resuelto;

    const actual = resuelto.entidad;
    await servicioModel.updateServicio(actual.id, {
      descripcion: nueva_descripcion || actual.descripcion,
      precio: nuevo_precio || actual.precio,
      duracion_sugerida: nueva_duracion || actual.duracion_sugerida,
    });

    return { ok: true, mensaje: `Servicio "${actual.descripcion}" actualizado.` };
  } catch (error) {
    logger.error("asistente.confirmarEditarServicio.failed", { error: error.message });
    return { ok: false, mensaje: "No pude editar el servicio, avisale a Juanma." };
  }
};

const proponerEliminarServicio = async ({ nombre }) => {
  try {
    const resuelto = await resolverUnico(servicioModel.searchServicios, nombre, "servicio");
    if (!resuelto.ok) return resuelto;

    const totalTurnos = await contarTurnosDeServicio(resuelto.entidad.id);
    const avisoTurnos = totalTurnos > 0
      ? ` OJO: hay ${totalTurnos} turno(s) que usan este servicio, y también se van a borrar junto con el servicio.`
      : "";

    return {
      ok: true,
      confirmado: false,
      resumen: `Vas a eliminar el servicio "${resuelto.entidad.descripcion}".${avisoTurnos} Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarServicio.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEliminarServicio.failed", { error: error.message });
    return { ok: false, mensaje: "No pude buscar ese servicio, intentá de nuevo." };
  }
};

const confirmarEliminarServicio = async ({ nombre }) => {
  try {
    const resuelto = await resolverUnico(servicioModel.searchServicios, nombre, "servicio");
    if (!resuelto.ok) return resuelto;
    await servicioModel.deleteServicio(resuelto.entidad.id);
    return { ok: true, mensaje: `Servicio "${resuelto.entidad.descripcion}" eliminado.` };
  } catch (error) {
    logger.error("asistente.confirmarEliminarServicio.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar el servicio, avisale a Juanma." };
  }
};

const functionDeclarations = [
  {
    name: "consultarServicios",
    description: "Busca servicios del catálogo por nombre (solo lectura). Si no se pasa nombre, devuelve todos.",
    parameters: {
      type: "OBJECT",
      properties: { nombre: { type: "STRING", description: "Nombre o descripción a buscar (opcional)" } },
      required: [],
    },
  },
  {
    name: "proponerCrearServicio",
    description: "Arma una propuesta de servicio nuevo para el catálogo SIN guardarlo. Pedile confirmación a Sol antes de confirmarCrearServicio.",
    parameters: {
      type: "OBJECT",
      properties: {
        descripcion: { type: "STRING" },
        precio: { type: "NUMBER" },
        duracion_sugerida: { type: "NUMBER", description: "Duración sugerida en minutos" },
      },
      required: ["descripcion"],
    },
  },
  {
    name: "confirmarCrearServicio",
    description: "Crea el servicio de verdad en el catálogo. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        descripcion: { type: "STRING" },
        precio: { type: "NUMBER" },
        duracion_sugerida: { type: "NUMBER" },
      },
      required: ["descripcion"],
    },
  },
  {
    name: "proponerEditarServicio",
    description: "Arma una propuesta de edición de un servicio existente (buscado por nombre actual) sin guardar nada.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre_actual: { type: "STRING" },
        nueva_descripcion: { type: "STRING" },
        nuevo_precio: { type: "NUMBER" },
        nueva_duracion: { type: "NUMBER" },
      },
      required: ["nombre_actual"],
    },
  },
  {
    name: "confirmarEditarServicio",
    description: "Aplica de verdad la edición del servicio. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre_actual: { type: "STRING" },
        nueva_descripcion: { type: "STRING" },
        nuevo_precio: { type: "NUMBER" },
        nueva_duracion: { type: "NUMBER" },
      },
      required: ["nombre_actual"],
    },
  },
  {
    name: "proponerEliminarServicio",
    description: "Busca un servicio del catálogo y arma una propuesta de eliminación SIN borrar nada. Avisa si hay turnos que usan ese servicio y también se borrarían. Acción irreversible.",
    parameters: {
      type: "OBJECT",
      properties: { nombre: { type: "STRING" } },
      required: ["nombre"],
    },
  },
  {
    name: "confirmarEliminarServicio",
    description: "Elimina de verdad el servicio (y en cascada los turnos que lo usan). NUNCA llamar sin confirmación verbal explícita e inequívoca de Sol, habiendo escuchado el aviso de cuántos turnos se pierden.",
    parameters: {
      type: "OBJECT",
      properties: { nombre: { type: "STRING" } },
      required: ["nombre"],
    },
  },
];

const ejecutar = async (nombre, args) => {
  switch (nombre) {
    case "consultarServicios":
      return consultarServicios(args);
    case "proponerCrearServicio":
      return proponerCrearServicio(args);
    case "confirmarCrearServicio":
      return confirmarCrearServicio(args);
    case "proponerEditarServicio":
      return proponerEditarServicio(args);
    case "confirmarEditarServicio":
      return confirmarEditarServicio(args);
    case "proponerEliminarServicio":
      return proponerEliminarServicio(args);
    case "confirmarEliminarServicio":
      return confirmarEliminarServicio(args);
    default:
      return null;
  }
};

const systemInstructionFragment =
  "Para crear, editar o eliminar un servicio del catálogo, usá siempre primero la herramienta 'proponer...' correspondiente, leele el resumen completo a Sol (incluido cualquier aviso sobre turnos que se perderían al eliminar), y SOLO después de una confirmación verbal explícita e inequívoca llamá a la herramienta 'confirmar...'. Eliminar un servicio no se puede deshacer y borra también los turnos que lo usan.";

module.exports = { functionDeclarations, ejecutar, systemInstructionFragment };
