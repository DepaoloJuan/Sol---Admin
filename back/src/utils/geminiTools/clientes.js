const pool = require("../../api/database/db");
const logger = require("../logger");
const clienteModel = require("../../api/models/clienteModel");
const { resolverUnico } = require("./_shared");

const contarTurnosDeCliente = async (idCliente) => {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS total FROM public.turnos WHERE id_cliente = $1",
    [idCliente],
  );
  return rows[0].total;
};

const consultarClientes = async ({ nombre }) => {
  try {
    const clientes = await clienteModel.searchClientes(nombre);
    return {
      ok: true,
      clientes: clientes.map((c) => ({
        nombre: `${c.nombre || ""} ${c.apellido || ""}`.trim(),
        telefono: c.telefono,
      })),
    };
  } catch (error) {
    logger.error("asistente.consultarClientes.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar clientes, intentá de nuevo." };
  }
};

const proponerCrearCliente = async ({ nombre, apellido, telefono }) => {
  return {
    ok: true,
    confirmado: false,
    resumen: `Nuevo cliente: ${nombre} ${apellido || ""}${telefono ? `, teléfono ${telefono}` : ""}. Pedile confirmación explícita a Sol antes de llamar a confirmarCrearCliente.`,
  };
};

const confirmarCrearCliente = async ({ nombre, apellido, telefono }) => {
  try {
    const cliente = await clienteModel.createCliente({ nombre, apellido, telefono });
    return { ok: true, mensaje: `Cliente ${cliente.nombre} ${cliente.apellido || ""} creado.` };
  } catch (error) {
    logger.error("asistente.confirmarCrearCliente.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear el cliente, avisale a Juanma." };
  }
};

const proponerEditarCliente = async ({ nombre_actual, nuevo_nombre, nuevo_apellido, nuevo_telefono }) => {
  try {
    const resuelto = await resolverUnico(clienteModel.searchClientes, nombre_actual, "cliente");
    if (!resuelto.ok) return resuelto;

    const cambios = [];
    if (nuevo_nombre) cambios.push(`nombre → ${nuevo_nombre}`);
    if (nuevo_apellido) cambios.push(`apellido → ${nuevo_apellido}`);
    if (nuevo_telefono) cambios.push(`teléfono → ${nuevo_telefono}`);
    if (cambios.length === 0) {
      return { ok: false, mensaje: "No me dijiste qué cambiar de ese cliente." };
    }

    return {
      ok: true,
      confirmado: false,
      resumen: `Cliente ${resuelto.entidad.nombre} ${resuelto.entidad.apellido || ""}. Cambios propuestos: ${cambios.join(", ")}. Pedile confirmación explícita a Sol antes de llamar a confirmarEditarCliente.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEditarCliente.failed", { error: error.message });
    return { ok: false, mensaje: "No pude armar la edición del cliente, intentá de nuevo." };
  }
};

const confirmarEditarCliente = async ({ nombre_actual, nuevo_nombre, nuevo_apellido, nuevo_telefono }) => {
  try {
    const resuelto = await resolverUnico(clienteModel.searchClientes, nombre_actual, "cliente");
    if (!resuelto.ok) return resuelto;

    const actual = resuelto.entidad;
    await clienteModel.updateCliente(actual.id, {
      nombre: nuevo_nombre || actual.nombre,
      apellido: nuevo_apellido || actual.apellido,
      telefono: nuevo_telefono || actual.telefono,
      dia_cumple: actual.dia_cumple,
      mes_cumple: actual.mes_cumple,
    });

    return { ok: true, mensaje: `Cliente ${actual.nombre} actualizado.` };
  } catch (error) {
    logger.error("asistente.confirmarEditarCliente.failed", { error: error.message });
    return { ok: false, mensaje: "No pude editar el cliente, avisale a Juanma." };
  }
};

const proponerEliminarCliente = async ({ nombre }) => {
  try {
    const resuelto = await resolverUnico(clienteModel.searchClientes, nombre, "cliente");
    if (!resuelto.ok) return resuelto;

    const totalTurnos = await contarTurnosDeCliente(resuelto.entidad.id);
    const avisoTurnos = totalTurnos > 0
      ? ` OJO: este cliente tiene ${totalTurnos} turno(s) cargados, y también se van a borrar junto con el cliente.`
      : "";

    return {
      ok: true,
      confirmado: false,
      resumen: `Vas a eliminar al cliente ${resuelto.entidad.nombre} ${resuelto.entidad.apellido || ""}.${avisoTurnos} Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarCliente.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEliminarCliente.failed", { error: error.message });
    return { ok: false, mensaje: "No pude buscar ese cliente, intentá de nuevo." };
  }
};

const confirmarEliminarCliente = async ({ nombre }) => {
  try {
    const resuelto = await resolverUnico(clienteModel.searchClientes, nombre, "cliente");
    if (!resuelto.ok) return resuelto;
    await clienteModel.deleteCliente(resuelto.entidad.id);
    return { ok: true, mensaje: `Cliente ${resuelto.entidad.nombre} eliminado.` };
  } catch (error) {
    logger.error("asistente.confirmarEliminarCliente.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar el cliente, avisale a Juanma." };
  }
};

const functionDeclarations = [
  {
    name: "consultarClientes",
    description: "Busca clientes por nombre o apellido (solo lectura).",
    parameters: {
      type: "OBJECT",
      properties: { nombre: { type: "STRING", description: "Nombre o apellido a buscar" } },
      required: ["nombre"],
    },
  },
  {
    name: "proponerCrearCliente",
    description: "Arma una propuesta de cliente nuevo SIN guardarlo. Pedile confirmación a Sol antes de confirmarCrearCliente.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre: { type: "STRING" },
        apellido: { type: "STRING" },
        telefono: { type: "STRING" },
      },
      required: ["nombre"],
    },
  },
  {
    name: "confirmarCrearCliente",
    description: "Crea el cliente de verdad en la base. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre: { type: "STRING" },
        apellido: { type: "STRING" },
        telefono: { type: "STRING" },
      },
      required: ["nombre"],
    },
  },
  {
    name: "proponerEditarCliente",
    description: "Arma una propuesta de edición de un cliente existente (buscado por nombre actual) sin guardar nada.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre_actual: { type: "STRING" },
        nuevo_nombre: { type: "STRING" },
        nuevo_apellido: { type: "STRING" },
        nuevo_telefono: { type: "STRING" },
      },
      required: ["nombre_actual"],
    },
  },
  {
    name: "confirmarEditarCliente",
    description: "Aplica de verdad la edición del cliente. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre_actual: { type: "STRING" },
        nuevo_nombre: { type: "STRING" },
        nuevo_apellido: { type: "STRING" },
        nuevo_telefono: { type: "STRING" },
      },
      required: ["nombre_actual"],
    },
  },
  {
    name: "proponerEliminarCliente",
    description: "Busca un cliente y arma una propuesta de eliminación SIN borrar nada. Avisa si tiene turnos asociados que también se borrarían. Acción irreversible.",
    parameters: {
      type: "OBJECT",
      properties: { nombre: { type: "STRING" } },
      required: ["nombre"],
    },
  },
  {
    name: "confirmarEliminarCliente",
    description: "Elimina de verdad al cliente (y en cascada sus turnos). NUNCA llamar sin confirmación verbal explícita e inequívoca de Sol sobre esa propuesta puntual, habiendo escuchado el aviso de cuántos turnos se pierden.",
    parameters: {
      type: "OBJECT",
      properties: { nombre: { type: "STRING" } },
      required: ["nombre"],
    },
  },
];

const ejecutar = async (nombre, args) => {
  switch (nombre) {
    case "consultarClientes":
      return consultarClientes(args);
    case "proponerCrearCliente":
      return proponerCrearCliente(args);
    case "confirmarCrearCliente":
      return confirmarCrearCliente(args);
    case "proponerEditarCliente":
      return proponerEditarCliente(args);
    case "confirmarEditarCliente":
      return confirmarEditarCliente(args);
    case "proponerEliminarCliente":
      return proponerEliminarCliente(args);
    case "confirmarEliminarCliente":
      return confirmarEliminarCliente(args);
    default:
      return null;
  }
};

const systemInstructionFragment =
  "Para crear, editar o eliminar un cliente, usá siempre primero la herramienta 'proponer...' correspondiente, leele el resumen completo a Sol (incluido cualquier aviso sobre turnos que se perderían al eliminar), y SOLO después de una confirmación verbal explícita e inequívoca llamá a la herramienta 'confirmar...'. Eliminar un cliente no se puede deshacer y borra también sus turnos.";

module.exports = { functionDeclarations, ejecutar, systemInstructionFragment };
