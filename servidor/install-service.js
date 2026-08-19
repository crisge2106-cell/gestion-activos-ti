// install-service.js
// Instala "Gestion de Activos TI" (server.js) como Servicio de Windows.
//
// REQUISITOS:
//   1) Tener Node.js instalado.
//   2) Ejecutar desde una consola CMD/PowerShell ABIERTA COMO ADMINISTRADOR,
//      parado en ESTA MISMA carpeta (donde esta server.js).
//   3) Antes de correr este script, instala la dependencia (una sola vez),
//      parado en esta carpeta:
//        npm install node-windows
//
// USO:
//   node install-service.js
//
// Esto crea el servicio de Windows:
//   ActivosTI-Servidor
//
// Lo veras, iniciaras, detendras o reiniciaras desde services.msc (Servicios de Windows),
// y arrancara solo cuando encienda el equipo (si lo dejas en modo "Automatico").

const path = require("path");
const { Service } = require("node-windows");

// >>> Debe ser la carpeta donde esta server.js de este proyecto <<<
const PROJECT_DIR = __dirname;

const svc = new Service({
  name: "ActivosTI-Servidor",
  description: "Gestion de Activos TI - Axis Group (server.js)",
  script: path.join(PROJECT_DIR, "server.js"),
  // Carpeta de trabajo = la carpeta del proyecto (equivalente al "cd /d %~dp0" del .bat)
  workingDirectory: PROJECT_DIR,
  nodeOptions: [],
});

svc.on("install", () => {
  console.log("[OK] Servicio instalado: ActivosTI-Servidor");
  svc.start();
});

svc.on("alreadyinstalled", () => {
  console.log("[i] Ya estaba instalado: ActivosTI-Servidor (usa uninstall-service.js si quieres reinstalar)");
});

svc.on("start", () => {
  console.log("[OK] Servicio iniciado: ActivosTI-Servidor");
});

svc.on("error", (err) => {
  console.error("[ERROR] ActivosTI-Servidor:", err);
});

svc.install();
