# Sol Admin — Sistema de Gestión para Salones de Belleza

Sistema web **SaaS en producción** para la administración completa de un salón de estética. Desarrollado y mantenido como proyecto real con cliente activo.

🌐 **Demo:** [admin.solcantero.com.ar](https://admin.solcantero.com.ar)

---

## Funcionalidades

**Agenda visual**
Calendario diario por empleada con turnos codificados por color según estado de pago (Pagado / Parcial / Pendiente). Creación, edición y eliminación de turnos con toda la información del servicio.

**Gestión de clientas**
Registro completo con historial de turnos y datos de contacto.

**Catálogo de servicios**
Precios y duraciones sugeridas actualizables directamente desde cada turno.

**Control financiero**
Reportes de facturación, cobros, deuda pendiente, gastos y ganancia neta por período. Registro de egresos categorizados. Reporte anual comparativo por año.

**Gestión de empleadas**
Perfiles individuales con porcentaje de ganancia configurable. Cada empleada accede solo a sus turnos y métricas personales.

**Sistema de roles**
El admin tiene visibilidad total del negocio. Las empleadas ven únicamente su propio panel.

**Importación / Exportación Excel**
Carga y descarga masiva de clientes y servicios en formato `.xlsx`.

---

## Stack tecnológico

| Capa          | Tecnología                              |
| ------------- | --------------------------------------- |
| Backend       | Node.js + Express 5                     |
| Base de datos | PostgreSQL                              |
| Vistas        | EJS (server-side rendering)             |
| Arquitectura  | MVC                                     |
| Estilos       | CSS puro con variables (sin frameworks) |
| Logging       | Winston                                 |
| Excel         | ExcelJS                                 |
| Deploy        | Render (backend)                        |

---

## Seguridad

- Contraseñas hasheadas con **bcrypt**
- **Helmet** — protección contra XSS, clickjacking y sniffing de contenido
- **Rate limiting** en login con `express-rate-limit` — previene ataques de fuerza bruta
- **Sesiones seguras** con `express-session`: `httpOnly`, `secure` en producción, `sameSite: strict`, expiración a las 8 horas
- Variables de entorno con `dotenv` — sin credenciales hardcodeadas
- Middleware de autenticación en todas las rutas protegidas

---

## Arquitectura destacada

- Validación centralizada con funciones puras en `src/api/validators/`
- Utilidades compartidas en `src/utils/` (logger, dateHelpers, reporteHelpers)
- Transacciones en BD para operaciones compuestas — rollback automático ante fallo
- Logging estructurado con niveles (`info`, `warn`, `error`) y contexto por operación

---

## Estructura del proyecto

```
src/
├── api/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   └── validators/
├── utils/
│   ├── logger.js
│   ├── dateHelpers.js
│   └── reporteHelpers.js
├── views/
└── public/
```

---

## Variables de entorno requeridas

```env
PORT=3000
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
SESSION_SECRET=
NODE_ENV=development
```

---

## Autor

**Juan Manuel** — Desarrollador Full Stack
