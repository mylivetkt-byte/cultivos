#!/bin/bash
# ============================================================
# EJECUTAR TODOS LOS SCRIPTS SQL - MÓDULO DE PRODUCCIÓN
# Script consolidado que ejecuta en secuencia
# ============================================================

# Credenciales desde .env
MYSQL_HOST="127.0.0.1"
MYSQL_PORT="3307"
MYSQL_USER="root"
MYSQL_PASSWORD="12345"
MYSQL_DATABASE="sas_agricolas"

echo "════════════════════════════════════════════════════════════════"
echo "  EJECUTANDO SCRIPTS SQL - MÓDULO DE PRODUCCIÓN"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Host: $MYSQL_HOST:$MYSQL_PORT"
echo "Usuario: $MYSQL_USER"
echo "Base de Datos: $MYSQL_DATABASE"
echo ""

# ========================================
# Función para ejecutar script
# ========================================
execute_script() {
    local script_file=$1
    local script_name=$2

    if [ ! -f "$script_file" ]; then
        echo "❌ ARCHIVO NO ENCONTRADO: $script_file"
        return 1
    fi

    echo "📋 Ejecutando: $script_name"
    echo "   Archivo: $script_file"

    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" < "$script_file" 2>&1

    if [ $? -eq 0 ]; then
        echo "✅ $script_name - COMPLETADO"
        echo ""
        return 0
    else
        echo "❌ $script_name - FALLÓ"
        echo ""
        return 1
    fi
}

# ========================================
# Ejecutar scripts en orden
# ========================================

FAILED=0

# Script 1
execute_script "migrations/produccion/01_ALTER_existentes.sql" "Script 01: Alteraciones Existentes"
[ $? -ne 0 ] && FAILED=$((FAILED + 1))

# Script 2
execute_script "migrations/produccion/02_CREATE_inv_lotes_existencia.sql" "Script 02: Inventario Lotes Existencia"
[ $? -ne 0 ] && FAILED=$((FAILED + 1))

# Script 3
execute_script "migrations/produccion/03_CREATE_produccion.sql" "Script 03: Producción"
[ $? -ne 0 ] && FAILED=$((FAILED + 1))

# Script 3b
execute_script "migrations/produccion/03b_CREATE_produccion_lotes.sql" "Script 03b: Producción Lotes"
[ $? -ne 0 ] && FAILED=$((FAILED + 1))

# Script 3c
execute_script "migrations/produccion/03c_CREATE_produccion_costos_cuentas_precios.sql" "Script 03c: Producción Costos"
[ $? -ne 0 ] && FAILED=$((FAILED + 1))

# Script 3d (PRINCIPAL)
execute_script "migrations/produccion/03d_CREATE_produccion_precios_mercado.sql" "Script 03d: Producción Precios Mercado (PRINCIPAL)"
[ $? -ne 0 ] && FAILED=$((FAILED + 1))

# ========================================
# Resumen Final
# ========================================
echo "════════════════════════════════════════════════════════════════"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅✅✅ TODOS LOS SCRIPTS EJECUTADOS EXITOSAMENTE ✅✅✅"
    echo ""
    echo "🎉 Próximos pasos:"
    echo "  1. npm install @tanstack/react-table uuid"
    echo "  2. node scripts/seed_produccion.cjs"
    echo "  3. npm run dev:server"
    echo "  4. Abrir http://localhost:3002/produccion/historico"
    echo ""
else
    echo "❌ $FAILED script(s) fallaron"
    echo "Revisa los errores arriba"
    exit 1
fi

echo "════════════════════════════════════════════════════════════════"
