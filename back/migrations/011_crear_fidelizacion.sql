CREATE TABLE landing_cuentas (
  id SERIAL PRIMARY KEY,
  google_sub VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  nombre VARCHAR(255),
  telefono_ingresado VARCHAR(50),
  id_cliente INTEGER REFERENCES clientes(id),
  estado_vinculacion VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado_vinculacion IN ('pendiente', 'auto', 'manual', 'rechazada')),
  token_sesion VARCHAR(64),
  token_expira_at TIMESTAMPTZ,
  reset_token VARCHAR(64),
  reset_token_expira TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (google_sub IS NOT NULL OR password_hash IS NOT NULL)
);
CREATE INDEX idx_landing_cuentas_cliente ON landing_cuentas(id_cliente);

CREATE TABLE fidelidad_sellos (
  id SERIAL PRIMARY KEY,
  id_cuenta INTEGER NOT NULL REFERENCES landing_cuentas(id) ON DELETE CASCADE,
  id_turno INTEGER NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  numero_sello INTEGER NOT NULL,
  ciclo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id_turno),
  UNIQUE(id_cuenta, ciclo, numero_sello)
);
CREATE INDEX idx_fidelidad_sellos_cuenta ON fidelidad_sellos(id_cuenta);

CREATE TABLE fidelidad_premios (
  id SERIAL PRIMARY KEY,
  id_cuenta INTEGER NOT NULL REFERENCES landing_cuentas(id) ON DELETE CASCADE,
  ciclo INTEGER NOT NULL,
  sello_numero INTEGER NOT NULL CHECK (sello_numero BETWEEN 1 AND 10),
  tipo_premio VARCHAR(50),
  descripcion VARCHAR(255),
  redimido BOOLEAN NOT NULL DEFAULT false,
  redimido_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id_cuenta, ciclo, sello_numero)
);

-- Configurable desde /fidelidad/premios: en qué sello hay oportunidad de premio.
CREATE TABLE fidelidad_reglas_premio (
  id SERIAL PRIMARY KEY,
  numero_sello INTEGER NOT NULL UNIQUE CHECK (numero_sello BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO fidelidad_reglas_premio (numero_sello) VALUES (5), (10);

-- Catálogo editable de premios posibles (sorteo ponderado por "peso").
CREATE TABLE fidelidad_premios_catalogo (
  id SERIAL PRIMARY KEY,
  descripcion VARCHAR(255) NOT NULL,
  peso INTEGER NOT NULL DEFAULT 10 CHECK (peso > 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO fidelidad_premios_catalogo (descripcion, peso) VALUES
  ('10% de descuento en tu próximo turno', 40),
  ('20% de descuento en tu próximo turno', 25),
  ('Perfilado de cejas gratis', 15),
  ('Manicura gratis', 15),
  ('50% de descuento en tu próximo turno', 5);

-- Config global del programa: fila única. fecha_inicio NULL = programa
-- pausado, nadie suma sello. Sol la carga desde /fidelidad cuando ella y
-- la secretaria terminen de configurar qué servicios cuentan (ver
-- fidelidad_servicios_habilitados más abajo).
CREATE TABLE fidelidad_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  fecha_inicio DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO fidelidad_config (id, fecha_inicio) VALUES (1, NULL);

-- Lista blanca de servicios que suman sello ("servicio completo"). Vacía
-- por default a propósito: mejor que falte un servicio (no suma, se
-- corrige agregándolo) a que sobre (sumó algo que no debía y hay que
-- deshacerlo a mano). Vive en el dominio de fidelización, no en
-- servicios_base, porque es una decisión de negocio de este programa
-- puntual, no una propiedad del servicio en sí.
CREATE TABLE fidelidad_servicios_habilitados (
  id_servicio INTEGER PRIMARY KEY REFERENCES servicios_base(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Snapshot de qué reglas (fidelidad_reglas_premio) estaban vigentes cuando
-- arrancó cada tarjeta (ciclo) de cada clienta. Se congela al otorgar el
-- sello número 1 de un ciclo nuevo, y es lo que se consulta para decidir si
-- CADA sello de esa tarjeta otorga premio — así, si Sol edita las reglas a
-- mitad de tarjeta, el cambio no le pisa la tarjeta a nadie que ya la tenga
-- en curso: sólo aplica a la próxima tarjeta de cada clienta.
CREATE TABLE fidelidad_reglas_ciclo (
  id SERIAL PRIMARY KEY,
  id_cuenta INTEGER NOT NULL REFERENCES landing_cuentas(id) ON DELETE CASCADE,
  ciclo INTEGER NOT NULL,
  numero_sello INTEGER NOT NULL CHECK (numero_sello BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id_cuenta, ciclo, numero_sello)
);
CREATE INDEX idx_fidelidad_reglas_ciclo_cuenta ON fidelidad_reglas_ciclo(id_cuenta, ciclo);

-- Backfill: cuentas que ya tenían sellos cargados antes de este cambio no
-- tienen snapshot propio. Se les asigna el mejor sustituto posible — las
-- reglas vigentes HOY — porque no existe registro histórico de qué reglas
-- regían en cada momento pasado. Es una aproximación conocida, no exacta.
INSERT INTO fidelidad_reglas_ciclo (id_cuenta, ciclo, numero_sello)
SELECT DISTINCT fs.id_cuenta, fs.ciclo, r.numero_sello
FROM fidelidad_sellos fs
CROSS JOIN fidelidad_reglas_premio r
ON CONFLICT (id_cuenta, ciclo, numero_sello) DO NOTHING;
