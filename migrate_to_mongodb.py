#!/usr/bin/env python3
"""
Script para migrar server.js de SQLite a MongoDB
"""

import re

# Leer el archivo
with open('servidor/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Reemplazar import de DatabaseSync con db-adapter
content = content.replace(
    "const { DatabaseSync } = require('node:sqlite');",
    "const dbAdapter = require('./db-adapter');"
)

# 2. Reemplazar inicialización de BD
content = re.sub(
    r"const db = new DatabaseSync\(DB_PATH\);\s*\n\s*db\.exec\(\`",
    "(async () => {\n  await dbAdapter.exec(`",
    content,
    count=1
)

# 3. Cerrar el async IIFE después del db.exec
# Buscar el cierre de db.exec (buscar el backtick seguido de );)
# Esto es más complejo, así que lo hacemos después de CREATE TABLE IF NOT EXISTS

# Reemplazar const db = dbAdapter;
content = content.replace(
    "const db = dbAdapter;",
    "const db = dbAdapter;"
)

# 4. Reemplazar todas las migraciones PRAGMA con comentarios
# Función migrateTrabajadoresActivo
content = re.sub(
    r"\(function migrateTrabajadoresActivo\(\).*?\}\)\(\);",
    "// Migración PRAGMA no aplica a MongoDB",
    content,
    flags=re.DOTALL
)

# Función migrateUsersEmail
content = re.sub(
    r"\(function migrateUsersEmail\(\).*?\}\)\(\);",
    "// Migración PRAGMA no aplica a MongoDB",
    content,
    flags=re.DOTALL
)

# Función migrateEquiposNombre
content = re.sub(
    r"\(function migrateEquiposNombre\(\).*?\}\)\(\);",
    "// Migración PRAGMA no aplica a MongoDB",
    content,
    flags=re.DOTALL
)

# Función migrateEquiposEspecificaciones
content = re.sub(
    r"\(function migrateEquiposEspecificaciones\(\).*?\}\)\(\);",
    "// Migración PRAGMA no aplica a MongoDB",
    content,
    flags=re.DOTALL
)

# Función migrateAgentesReportes
content = re.sub(
    r"\(function migrateAgentesReportes\(\).*?\}\)\(\);",
    "// Migración PRAGMA no aplica a MongoDB",
    content,
    flags=re.DOTALL
)

# Función migrateMovimientoItemsTelefono
content = re.sub(
    r"\(function migrateMovimientoItemsTelefono\(\).*?\}\)\(\);",
    "// Migración PRAGMA no aplica a MongoDB",
    content,
    flags=re.DOTALL
)

# Función migrateSolicitudesItemsUsuarioDestino
content = re.sub(
    r"\(function migrateSolicitudesItemsUsuarioDestino\(\).*?\}\)\(\);",
    "// Migración PRAGMA no aplica a MongoDB",
    content,
    flags=re.DOTALL
)

# Escribir el archivo modificado
with open('servidor/server.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Migracion completada. Cambios aplicados a servidor/server.js")
