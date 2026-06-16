require("dotenv").config();
const express = require("express");
const logger = require("./src/utils/logger");
const helmet = require("helmet");
const path = require("path");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const pool = require("./src/api/database/db");
const methodOverride = require("method-override");

const authRoutes = require("./src/api/routes/authRoutes");
const agendaRoutes = require("./src/api/routes/agendaRoutes");
const clienteRoutes = require("./src/api/routes/clienteRoutes");
const servicioRoutes = require("./src/api/routes/servicioRoutes");
const turnoRoutes = require("./src/api/routes/turnoRoutes");
const empleadoRoutes = require("./src/api/routes/empleadoRoutes");
const reporteRoutes = require("./src/api/routes/reporteRoutes");
const miPanelRoutes = require("./src/api/routes/miPanelRoutes");
const usuarioRoutes = require("./src/api/routes/usuarioRoutes");
const laserRoutes = require("./src/api/routes/laserRoutes");

const {
  requireAuth,
  requireAdmin,
} = require("./src/api/middlewares/authMiddleware");

const { calcularDatosDashboard } = require("./src/utils/reporteHelpers");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

app.use(express.static(path.join(__dirname, "src/public"), {
  maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
  etag: false,
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.use("/", authRoutes);
app.use("/", agendaRoutes);
app.use("/", clienteRoutes);
app.use("/", servicioRoutes);
app.use("/", turnoRoutes);
app.use("/", miPanelRoutes);
app.use("/", empleadoRoutes);
app.use("/", reporteRoutes);
app.use("/", usuarioRoutes);
app.use("/", laserRoutes);

app.get("/admin", requireAdmin, async (req, res) => {
  try {
    const dashboard = await calcularDatosDashboard();
    res.render("admin/dashboard", {
      user: req.session.user,
      dashboard,
    });
  } catch (error) {
    res.status(500).send("Error al cargar el dashboard");
  }
});

app.use((err, req, res, next) => {
  logger.error("unhandled.error", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });
  res.status(err.status || 500).send("Error interno del servidor");
});

app.listen(PORT, () => {
  logger.info("Servidor corriendo", { port: PORT, env: process.env.NODE_ENV });
});
