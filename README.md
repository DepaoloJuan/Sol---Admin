# Sol Cantero Centro de Belleza - Sistema de Gestión

## Descripción General

Sistema administrativo interno para la gestión de turnos, clientes, empleados, servicios y reportes financieros en un centro de estética. Permite organizar la agenda diaria, controlar pagos, registrar gastos y generar informes financieros.

## Tecnologías Utilizadas

### Backend
- **Node.js** - Entorno de ejecución
- **Express.js** - Framework web
- **EJS** - Motor de plantillas
- **PostgreSQL** - Base de datos
- **pg** - Conector PostgreSQL
- **dotenv** - Variables de entorno
- **express-session** - Autenticación

### Frontend
- **HTML** - Estructura
- **CSS** - Estilos personalizados
- **JavaScript vanilla** - Lógica del lado del cliente
- **UI Dashboard** - Interfaz administrativa

## Estructura del Proyecto

```
src/
├── api/
│   ├── controllers/
│   │   ├── agendaController.js
│   │   ├── turnoController.js
│   │   ├── clienteController.js
│   │   ├── empleadoController.js
│   │   ├── servicioController.js
│   │   └── reporteController.js
│   └── models/
│       ├── turnoModel.js
│       ├── clienteModel.js
│       ├── empleadoModel.js
│       └── servicioModel.js
├── views/
│   ├── agenda/
│   │   ├── index.ejs
│   │   ├── nuevo.ejs
│   │   └── editar.ejs
│   ├── empleados/
│   ├── clientes/
│   ├── servicios/
│   ├── reportes/
│   └── partials/
│       ├── head.ejs
│       ├── sidebar.ejs
│       └── header.ejs
├── database/
│   └── db.js
└── middlewares/
    └── authMiddleware.js
```

## Funcionalidades Principales

### 1. Agenda de Turnos
- Vista tipo calendario en formato grilla
- Bloques dinámicos según duración del servicio
- Visualización por horario y empleado
- Uso de `rowspan` para turnos prolongados

### 2. Gestión de Turnos
- Crear, editar, eliminar turnos
- Cambiar cliente, servicio, empleado, duración, costo
- Campos: fecha, hora, cliente, empleado, servicio, duración, costo, estado, monto_abonado

### 3. Sistema de Pagos
- Estados de pago:
  - Pendiente
  - Parcial
  - Pagado
- Cálculo automático de saldo: `saldo = costo - monto_abonado`
- Visualización por colores en agenda:
  - Verde: Pagado
  - Amarillo: Parcial
  - Rojo: Pendiente

### 4. Clientes
- CRUD completo (Crear, Leer, Actualizar, Eliminar)
- Búsqueda y uso al crear turnos
- Campos: nombre, apellido, teléfono

### 5. Empleados
- CRUD completo
- Historial de turnos por empleado

### 6. Servicios
- CRUD completo
- Campos: descripción, precio, duración sugerida
- Auto-completado al seleccionar servicio

### 7. Reportes Financieros
- Turnos por período con columnas:
  - Fecha, hora, costo, abonado, deuda, estado
- Gestión de gastos (insumos, productos, alquiler, otros)

## Base de Datos

### Tablas Principales
- **usuarios** - Usuarios del sistema
- **clientes** - Clientes del centro
- **empleados** - Empleados del centro
- **servicios_base** - Servicios disponibles
- **turnos** - Turnos programados
- **gastos** - Gastos registrados

## Arquitectura MVC

El sistema sigue una arquitectura Modelo-Vista-Controlador:
- **Modelos**: Lógica de negocio y acceso a datos
- **Vistas**: Plantillas EJS para la interfaz
- **Controladores**: Manejo de solicitudes HTTP

## Estado Actual del Desarrollo

✅ Funcionalidades implementadas:
- Agenda funcional
- Turnos con duración dinámica
- Pagos parciales y cálculo de saldo
- Colores según estado de pago
- Clientes, empleados, servicios
- Reportes y gestión de gastos
- Autenticación

## Próximas Mejoras Planificadas

- Historial de clientes
- Estadísticas por empleado
- Dashboard financiero
- Control de comisiones
- Exportación de reportes
- Notificaciones de turnos
- Vista semanal de agenda

## Requisitos del Sistema

- Node.js (v14 o superior)
- PostgreSQL
- npm o yarn

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno en `.env`
4. Crear base de datos PostgreSQL y ejecutar migraciones
5. Iniciar el servidor:
   ```bash
   npm start
   ```

## Uso

1. Acceder al sistema mediante navegador
2. Iniciar sesión con credenciales válidas
3. Navegar por las diferentes secciones:
   - Agenda de turnos
   - Gestión de clientes
   - Gestión de empleados
   - Gestión de servicios
   - Reportes financieros

## Autor

Sol Cantero Centro de Belleza

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

*Versión actual: 1.0.0*
