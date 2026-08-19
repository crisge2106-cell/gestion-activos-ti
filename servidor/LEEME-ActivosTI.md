# Gestión de Activos TI — Convertir en Servicio de Windows

Esto reemplaza el uso manual de `iniciar_servidor.bat`.

## 1. Copia estos archivos

Copia `install-service.js` y `uninstall-service.js` a la carpeta donde está `server.js`
de este proyecto (la misma carpeta donde está `iniciar_servidor.bat`).

## 2. Instala la dependencia (una sola vez, por proyecto/carpeta)

Abre una consola (CMD o PowerShell) **como Administrador**, ve a esa carpeta y ejecuta:

```
npm install node-windows
```

> Nota: si ya instalaste `node-windows` en otra carpeta (por ejemplo `C:\axis_gl` del
> proyecto AXIS GL), eso NO sirve aquí. Cada carpeta de proyecto necesita su propio
> `node_modules`, así que corre `npm install node-windows` de nuevo parado en la carpeta
> de este servidor.

## 3. Instala el servicio

Desde la misma consola de Administrador, parado en esta carpeta:

```
node install-service.js
```

Esto crea y arranca el servicio `ActivosTI-Servidor`.

## 4. Verifica / administra el servicio

Abre `services.msc` (Ejecutar → escribe `services.msc`) y busca `ActivosTI-Servidor`.
Ahí puedes:
- Iniciarlo / detenerlo / reiniciarlo.
- Ponerlo en modo **Automático** para que arranque solo con Windows (recomendado).

## 5. Ver los logs

`node-windows` crea una carpeta `daemon` dentro de esta carpeta con los logs del servicio,
por ejemplo:

```
daemon\ActivosTI-Servidor.err.log
daemon\ActivosTI-Servidor.out.log
daemon\ActivosTI-Servidor.wrapper.log
```

Revísalos si el servicio no arranca o se detiene solo — ahí sale la causa real
(módulo faltante, puerto ocupado, etc.).

## 6. Si necesitas quitar el servicio

```
node uninstall-service.js
```

## Notas

- El `iniciar_servidor.bat` original ya no es necesario, pero puedes dejarlo como respaldo.
- El servidor sigue funcionando igual, solo cambia CÓMO se inicia (ya no hace falta
  abrir y dejar una ventana de consola abierta).
