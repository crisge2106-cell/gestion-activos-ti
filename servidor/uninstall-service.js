// uninstall-service.js
// Quita el servicio de Windows creado por install-service.js
//
// USO (consola como Administrador, parado en esta carpeta):
//   node uninstall-service.js

const path = require("path");
const { Service } = require("node-windows");

const PROJECT_DIR = __dirname;

const svc = new Service({
  name: "ActivosTI-Servidor",
  script: path.join(PROJECT_DIR, "server.js"),
});

svc.on("uninstall", () => {
  console.log("[OK] Servicio eliminado: ActivosTI-Servidor");
});

svc.on("error", (err) => {
  console.error("[ERROR] ActivosTI-Servidor:", err);
});

svc.uninstall();
