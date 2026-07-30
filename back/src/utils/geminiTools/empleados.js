const logger = require("../logger");
const empleadoModel = require("../../api/models/empleadoModel");
const { resolverUnico } = require("./_shared");

const consultarEmpleados = async ({ nombre }) => {
  try {
    const empleados = nombre
      ? await empleadoModel.searchEmpleados(nombre)
      : await empleadoModel.getAllEmpleados();

    return {
      ok: true,
      empleados: empleados.map((e) => ({
        nombre: `${e.nombre || ""} ${e.apellido || ""}`.trim(),
        telefono: e.telefono,
        porcentaje_ganancia: Number(e.porcentaje_ganancia || 0),
      })),
    };
  } catch (error) {
    logger.error("asistente.consultarEmpleados.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar empleadas, intentá de nuevo." };
  }
};

const proponerCrearEmpleado = async ({ nombre, apellido, telefono, email, porcentaje_ganancia }) => {
  return {
    ok: true,
    confirmado: false,
    resumen: `Nueva empleada: ${nombre} ${apellido || ""}${telefono ? `, teléfono ${telefono}` : ""}${porcentaje_ganancia ? `, ${porcentaje_ganancia}% de ganancia` : ""}. Pedile confirmación explícita a Sol antes de llamar a confirmarCrearEmpleado.`,
  };
};

const confirmarCrearEmpleado = async ({ nombre, apellido, telefono, email, porcentaje_ganancia }) => {
  try {
    const empleado = await empleadoModel.createEmpleado({ nombre, apellido, telefono, email, porcentaje_ganancia });
    return { ok: true, mensaje: `Empleada ${empleado.nombre} ${empleado.apellido || ""} creada.` };
  } catch (error) {
    logger.error("asistente.confirmarCrearEmpleado.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear la empleada, avisale a Juanma." };
  }
};

const proponerEditarEmpleado = async ({ nombre_actual, nuevo_nombre, nuevo_apellido, nuevo_telefono, nuevo_email, nuevo_porcentaje_ganancia }) => {
  try {
    const resuelto = await resolverUnico(empleadoModel.searchEmpleados, nombre_actual, "empleada");
    if (!resuelto.ok) return resuelto;

    const cambios = [];
    if (nuevo_nombre) cambios.push(`nombre → ${nuevo_nombre}`);
    if (nuevo_apellido) cambios.push(`apellido → ${nuevo_apellido}`);
    if (nuevo_telefono) cambios.push(`teléfono → ${nuevo_telefono}`);
    if (nuevo_email) cambios.push(`email → ${nuevo_email}`);
    if (nuevo_porcentaje_ganancia) cambios.push(`% ganancia → ${nuevo_porcentaje_ganancia}`);
    if (cambios.length === 0) {
      return { ok: false, mensaje: "No me dijiste qué cambiar de esa empleada." };
    }

    return {
      ok: true,
      confirmado: false,
      resumen: `Empleada ${resuelto.entidad.nombre} ${resuelto.entidad.apellido || ""}. Cambios propuestos: ${cambios.join(", ")}. Pedile confirmación explícita a Sol antes de llamar a confirmarEditarEmpleado.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEditarEmpleado.failed", { error: error.message });
    return { ok: false, mensaje: "No pude armar la edición de la empleada, intentá de nuevo." };
  }
};

const confirmarEditarEmpleado = async ({ nombre_actual, nuevo_nombre, nuevo_apellido, nuevo_telefono, nuevo_email, nuevo_porcentaje_ganancia }) => {
  try {
    const resuelto = await resolverUnico(empleadoModel.searchEmpleados, nombre_actual, "empleada");
    if (!resuelto.ok) return resuelto;

    const actual = resuelto.entidad;
    await empleadoModel.updateEmpleado(actual.id, {
      nombre: nuevo_nombre || actual.nombre,
      apellido: nuevo_apellido || actual.apellido,
      telefono: nuevo_telefono || actual.telefono,
      email: nuevo_email || actual.email,
      porcentaje_ganancia: nuevo_porcentaje_ganancia || actual.porcentaje_ganancia,
    });

    return { ok: true, mensaje: `Empleada ${actual.nombre} actualizada.` };
  } catch (error) {
    logger.error("asistente.confirmarEditarEmpleado.failed", { error: error.message });
    return { ok: false, mensaje: "No pude editar la empleada, avisale a Juanma." };
  }
};

const proponerEliminarEmpleado = async ({ nombre }) => {
  try {
    const resuelto = await resolverUnico(empleadoModel.searchEmpleados, nombre, "empleada");
    if (!resuelto.ok) return resuelto;

    return {
      ok: true,
      confirmado: false,
      resumen: `Vas a desactivar a la empleada ${resuelto.entidad.nombre} ${resuelto.entidad.apellido || ""}. No se borra su historial de turnos, pero deja de aparecer para asignarle turnos nuevos y ya no va a poder acceder al sistema. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarEmpleado.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEliminarEmpleado.failed", { error: error.message });
    return { ok: false, mensaje: "No pude buscar esa empleada, intentá de nuevo." };
  }
};

const confirmarEliminarEmpleado = async ({ nombre }) => {
  try {
    const resuelto = await resolverUnico(empleadoModel.searchEmpleados, nombre, "empleada");
    if (!resuelto.ok) return resuelto;
    await empleadoModel.deleteEmpleado(resuelto.entidad.id);
    return { ok: true, mensaje: `Empleada ${resuelto.entidad.nombre} desactivada.` };
  } catch (error) {
    logger.error("asistente.confirmarEliminarEmpleado.failed", { error: error.message });
    return { ok: false, mensaje: "No pude desactivar la empleada, avisale a Juanma." };
  }
};

const functionDeclarations = [
  {
    name: "consultarEmpleados",
    description: "Lista o busca empleadas activas por nombre (solo lectura). Si no se pasa nombre, devuelve todas las activas.",
    parameters: {
      type: "OBJECT",
      properties: { nombre: { type: "STRING", description: "Nombre o apellido a buscar (opcional)" } },
    },
  },
  {
    name: "proponerCrearEmpleado",
    description: "Arma una propuesta de empleada nueva SIN guardarla. Pedile confirmación a Sol antes de confirmarCrearEmpleado.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre: { type: "STRING" },
        apellido: { type: "STRING" },
        telefono: { type: "STRING" },
        email: { type: "STRING" },
        porcentaje_ganancia: { type: "NUMBER" },
      },
      required: ["nombre"],
    },
  },
  {
    name: "confirmarCrearEmpleado",
    description: "Crea la empleada de verdad en la base. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre: { type: "STRING" },
        apellido: { type: "STRING" },
        telefono: { type: "STRING" },
        email: { type: "STRING" },
        porcentaje_ganancia: { type: "NUMBER" },
      },
      required: ["nombre"],
    },
  },
  {
    name: "proponerEditarEmpleado",
    description: "Arma una propuesta de edición de una empleada existente (buscada por nombre actual) sin guardar nada.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre_actual: { type: "STRING" },
        nuevo_nombre: { type: "STRING" },
        nuevo_apellido: { type: "STRING" },
        nuevo_telefono: { type: "STRING" },
        nuevo_email: { type: "STRING" },
        nuevo_porcentaje_ganancia: { type: "NUMBER" },
      },
      required: ["nombre_actual"],
    },
  },
  {
    name: "confirmarEditarEmpleado",
    description: "Aplica de verdad la edición de la empleada. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre_actual: { type: "STRING" },
        nuevo_nombre: { type: "STRING" },
        nuevo_apellido: { type: "STRING" },
        nuevo_telefono: { type: "STRING" },
        nuevo_email: { type: "STRING" },
        nuevo_porcentaje_ganancia: { type: "NUMBER" },
      },
      required: ["nombre_actual"],
    },
  },
  {
    name: "proponerEliminarEmpleado",
    description: "Busca una empleada y arma una propuesta de desactivación SIN aplicar nada. Es una baja lógica (activa=false), no borra su historial.",
    parameters: {
      type: "OBJECT",
      properties: { nombre: { type: "STRING" } },
      required: ["nombre"],
    },
  },
  {
    name: "confirmarEliminarEmpleado",
    description: "Desactiva de verdad a la empleada (baja lógica, no destruye datos). NUNCA llamar sin confirmación verbal explícita e inequívoca de Sol sobre esa propuesta puntual.",
    parameters: {
      type: "OBJECT",
      properties: { nombre: { type: "STRING" } },
      required: ["nombre"],
    },
  },
];

const ejecutar = async (nombre, args) => {
  switch (nombre) {
    case "consultarEmpleados":
      return consultarEmpleados(args);
    case "proponerCrearEmpleado":
      return proponerCrearEmpleado(args);
    case "confirmarCrearEmpleado":
      return confirmarCrearEmpleado(args);
    case "proponerEditarEmpleado":
      return proponerEditarEmpleado(args);
    case "confirmarEditarEmpleado":
      return confirmarEditarEmpleado(args);
    case "proponerEliminarEmpleado":
      return proponerEliminarEmpleado(args);
    case "confirmarEliminarEmpleado":
      return confirmarEliminarEmpleado(args);
    default:
      return null;
  }
};

const systemInstructionFragment =
  "Para crear, editar o eliminar una empleada, usá siempre primero la herramienta 'proponer...' correspondiente, leele el resumen completo a Sol, y SOLO después de una confirmación verbal explícita e inequívoca llamá a la herramienta 'confirmar...'. Eliminar una empleada es en realidad una baja lógica (queda inactiva, no se borra su historial), pero igual requiere confirmación explícita porque deja de poder usar el sistema.";

module.exports = { functionDeclarations, ejecutar, systemInstructionFragment };
