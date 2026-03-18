Sistema de gestión para salones de belleza y estética

Software web diseñado para administrar de forma completa la operación diaria de un salón. Permite controlar la agenda, el equipo de trabajo, las clientas y las finanzas del negocio desde un solo lugar.
Lo que incluye:
Agenda visual: calendario semanal por empleada, con turnos codificados por color según estado de pago (pagado, señado, pendiente). Permite crear, editar y eliminar turnos con toda la información del servicio.
Gestión de clientas: registro completo con historial de turnos y datos de contacto.
Gestión de servicios: catálogo de servicios con precio y duración sugerida, actualizable desde cada turno.
Control financiero: reportes de facturación, cobros, deuda pendiente, gastos y ganancia neta por período. Registro de egresos categorizados.
Gestión de empleadas: perfiles con porcentaje de ganancia individual. Sistema de acceso por roles: el admin ve todo el negocio, cada empleada ve solo sus turnos y sus ganancias.
Diseño: interfaz moderna, modo oscuro, adaptada para desktop y móvil.

Stack tecnológico

Backend: Node.js con Express 5
Base de datos: PostgreSQL
Motor de vistas: EJS (renderizado server-side)
Arquitectura: MVC (Modelo - Vista - Controlador)
Estilos: CSS puro con variables, sin frameworks externos
Exportación: ExcelJS para importar/exportar datos en Excel

Seguridad implementada

Contraseñas hasheadas con bcrypt. Las contraseñas nunca se guardan en texto plano en la base de datos.
Helmet: protección contra ataques comunes web (XSS, clickjacking, sniffing de contenido, etc).
Rate limiting con express-rate-limit: limita los intentos de login para prevenir ataques de fuerza bruta.
Sesiones seguras con express-session: cookie httpOnly (no accesible desde JavaScript), secure en producción (solo HTTPS), sameSite: strict (previene CSRF), y expiración automática a las 8 horas.
Variables de entorno con dotenv: las credenciales de base de datos y el secreto de sesión nunca están hardcodeados en el código.
Middleware de autenticación en todas las rutas protegidas: cualquier intento de acceder sin sesión redirige al login.
