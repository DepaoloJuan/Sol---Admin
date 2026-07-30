const turnos = require("./turnos");
const clientes = require("./clientes");
const servicios = require("./servicios");
const empleados = require("./empleados");
const gastos = require("./gastos");
const laser = require("./laser");
const landing = require("./landing");
const reportes = require("./reportes");

const MODULOS = [turnos, clientes, servicios, empleados, gastos, laser, landing, reportes];

const TOOLS = [
  {
    functionDeclarations: MODULOS.flatMap((m) => m.functionDeclarations),
  },
];

const SYSTEM_INSTRUCTION =
  "Sos el asistente de voz y texto del sistema de administración de Sol Cantero (salón de estética). " +
  "Hablás en español rioplatense, con Sol (la dueña/admin). Podés usar las herramientas de consulta libremente para responder preguntas. " +
  "Si falta algún dato para una acción, preguntáselo antes de proponer nada. " +
  "Cuando Sol te diga un nombre de clienta, empleada o servicio (aunque sea un apodo corto, como 'Mili' en vez de 'Milagros'), probá primero con exactamente lo que dijo, SIN pedirle apellido ni nombre completo de entrada 'por las dudas' — las búsquedas ya encuentran por coincidencia parcial. Si la herramienta te devuelve que no encontró nada o que hay más de una coincidencia, ahí sí pedile precisión, guiándote por el mensaje de error que te dio. " +
  "Si Sol te manda una foto de turnos anotados a mano (en papel o agenda física), interpretá la escritura de la imagen, identificá cliente, servicio, fecha, hora y empleada para cada turno que veas, y si falta algún dato pedíselo por texto o voz antes de proponer nada. Usá siempre proponerTurno antes de confirmarTurno, igual que en cualquier otro caso — la foto es solo una fuente de datos más, no cambia el protocolo de confirmación. " +
  MODULOS.map((m) => m.systemInstructionFragment).join(" ");

const ejecutarTool = async (nombre, args) => {
  for (const modulo of MODULOS) {
    const resultado = await modulo.ejecutar(nombre, args);
    if (resultado !== null) return resultado;
  }
  return { ok: false, mensaje: `Herramienta desconocida: ${nombre}` };
};

module.exports = { TOOLS, SYSTEM_INSTRUCTION, ejecutarTool };
