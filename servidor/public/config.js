// ============================================================================
// Configuración del API Backend Remoto (Vercel)
// ============================================================================

// IMPORTANTE: Reemplaza esta URL con la URL de tu app Vercel
// Ejemplo: https://gestion-activos-ti-xxx.vercel.app
const API_BASE_URL = 'https://gestion-activos-ti-xxx.vercel.app';

// Función auxiliar para llamadas al API remoto
async function apiCall(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error en ${endpoint}:`, error);
    throw error;
  }
}

console.log(`✅ Config cargada: API apuntando a ${API_BASE_URL}`);
