// Cliente de API centralizado para el frontend.

const BASE = import.meta.env.VITE_API_URL || '';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || '';

async function request(path, { method = 'GET', body, admin = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (admin) headers['x-admin-key'] = ADMIN_KEY;

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = 'Ocurrió un error.';
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {
      /* respuesta sin JSON */
    }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

// ---------- API pública (participante) ----------
export const api = {
  estadoActividad: () => request('/config/estado'),

  iniciarParticipacion: () => request('/participaciones', { method: 'POST', body: {} }),

  guardarCredenciales: (id, correo, password) =>
    request(`/participaciones/${id}/credenciales`, {
      method: 'POST',
      body: { correo, password },
    }),

  registrarEvento: (id, tipo) =>
    request(`/participaciones/${id}/evento`, { method: 'POST', body: { tipo } }),

  // ---------- API administrativa (requiere clave) ----------
  admin: {
    resumen: () => request('/admin/resumen', { admin: true }),
    registros: () => request('/admin/registros', { admin: true }),
    estadisticas: () => request('/admin/estadisticas', { admin: true }),
    eventos: () => request('/admin/eventos', { admin: true }),
    config: () => request('/admin/config', { admin: true }),
    setConfig: (actividad_activa) =>
      request('/admin/config', { method: 'PUT', admin: true, body: { actividad_activa } }),
    exportUrl: `${BASE}/api/admin/export`,
    adminKey: ADMIN_KEY,
  },
};
