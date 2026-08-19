-- Actualizar nombres de equipos desde Excel
-- IMPORTANTE: Detén el servidor ANTES de ejecutar esto
-- Ejecutar con: sqlite3 activos.db < actualizar_nombres.sql

UPDATE equipos SET nombre = 'LPT-031' WHERE serie = 'MP2LFYPM';
UPDATE equipos SET nombre = 'Equipo-ACER-A515' WHERE serie = 'NXHSLAL00H034095FD7600';
UPDATE equipos SET nombre = 'Equipo-Lenovo-IDEAPAD-SLIM-3-14IAH8' WHERE serie = 'PF4DPWW2';
UPDATE equipos SET nombre = 'Equipo-Lenovo-IdeaPad-3-15IIL0' WHERE serie = 'PF39ALJG';
UPDATE equipos SET nombre = 'Equipo-ASUS-ZenBook-UX564EI_Q538EI' WHERE serie = 'MCN0CX335355523';
UPDATE equipos SET nombre = 'AXPA-DOC02' WHERE serie = 'PF2ERC56';
UPDATE equipos SET nombre = 'NOTEBOOK' WHERE serie = 'CND7030NW3';
UPDATE equipos SET nombre = 'LPT-023' WHERE serie = 'PF2ERB93';
UPDATE equipos SET nombre = 'AXPA-DOC02' WHERE serie = 'PF2ERC56';
UPDATE equipos SET nombre = ' LPT-003' WHERE serie = 'PF38HZBA';
UPDATE equipos SET nombre = 'AXLI-OPER06' WHERE serie = '5CD00704JS';
UPDATE equipos SET nombre = 'AXLIM-OPER09' WHERE serie = 'PF36D6PD';
UPDATE equipos SET nombre = 'AXLI-OPER07' WHERE serie = 'PF38J7R0';
UPDATE equipos SET nombre = 'LPT-009' WHERE serie = 'PF3K83N9';
UPDATE equipos SET nombre = 'LPT-017' WHERE serie = 'PF42F6EH';
UPDATE equipos SET nombre = 'LPT-013' WHERE serie = '8CG938MBXL';
UPDATE equipos SET nombre = 'AXLI-LEG01' WHERE serie = '5CD1298MDD';
UPDATE equipos SET nombre = 'LPT-064' WHERE serie = 'PF3JFYW7';
UPDATE equipos SET nombre = 'Equipo-XIAOMI-Redmi-Note-13' WHERE serie = '869912063449140';
UPDATE equipos SET nombre = 'LPT-053' WHERE serie = 'PF5AQL45';
UPDATE equipos SET nombre = 'AXPA-DOC03' WHERE serie = 'LR0EW8TD';
UPDATE equipos SET nombre = 'LPT-012' WHERE serie = '5CG7125ZHP';

-- Generar nombres automáticos para equipos sin nombre
UPDATE equipos SET nombre = 'Equipo-' || id WHERE nombre IS NULL OR nombre = '';

-- Verificar cambios
SELECT COUNT(*) as total_equipos, SUM(CASE WHEN nombre IS NOT NULL AND nombre != '' THEN 1 ELSE 0 END) as con_nombre FROM equipos;
