-- Agrega un título/cargo editable por el propio usuario (ej. "Lashista",
-- "Manicura", "Extensionista de pestañas") para mostrar en vez de la
-- etiqueta genérica "Empleada" en el sidebar. Nullable: sin título
-- cargado, sigue mostrando la etiqueta genérica de siempre.
ALTER TABLE usuarios ADD COLUMN titulo VARCHAR(50);
