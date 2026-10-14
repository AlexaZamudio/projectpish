import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPOS_EVENTO = ['acceso', 'credenciales', 'continuacion', 'finalizacion'];

// Lee el estado actual de la actividad desde configuracion.
async function getActividadActiva() {
  const { data, error } = await supabase
    .from('configuracion')
    .select('actividad_activa')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data?.actividad_activa ?? false;
}

// Registra un evento ligado a un participante.
async function registrarEvento(participanteId, tipo) {
  const { error } = await supabase
    .from('eventos')
    .insert({ participante_id: participanteId, tipo_evento: tipo });
  if (error) throw error;
}

/**
 * GET /api/config/estado
 * Público: la vista del participante consulta si la actividad está habilitada.
 */
router.get('/config/estado', async (_req, res) => {
  try {
    const activa = await getActividadActiva();
    res.json({ actividad_activa: activa });
  } catch (err) {
    console.error('GET /config/estado', err);
    res.status(500).json({ error: 'No se pudo consultar el estado de la actividad.' });
  }
});

/**
 * POST /api/participaciones
 * Crea una nueva participación y registra el evento 'acceso'.
 * Solo funciona si la actividad está habilitada.
 */
router.post('/participaciones', async (_req, res) => {
  try {
    if (!(await getActividadActiva())) {
      return res.status(403).json({ error: 'La actividad no está disponible.' });
    }

    const { data, error } = await supabase
      .from('participantes')
      .insert({ estado: 'iniciado' })
      .select('id')
      .single();
    if (error) throw error;

    await registrarEvento(data.id, 'acceso');
    res.status(201).json({ id: data.id });
  } catch (err) {
    console.error('POST /participaciones', err);
    res.status(500).json({ error: 'No se pudo iniciar la participación.' });
  }
});

/**
 * POST /api/participaciones/:id/credenciales
 * Guarda el correo y la contraseña ingresados en la simulación.
 * Valida ambos campos y el formato del correo. Evita duplicar el
 * evento 'credenciales' si se reenvía la misma solicitud.
 */
router.post('/participaciones/:id/credenciales', async (req, res) => {
  try {
    const { id } = req.params;
    const correo = typeof req.body?.correo === 'string' ? req.body.correo.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!correo || !password) {
      return res.status(400).json({ error: 'El correo y la contraseña son obligatorios.' });
    }
    if (!EMAIL_RE.test(correo)) {
      return res.status(400).json({ error: 'El formato del correo no es válido.' });
    }

    if (!(await getActividadActiva())) {
      return res.status(403).json({ error: 'La actividad no está disponible.' });
    }

    // Verifica que la participación exista.
    const { data: participante, error: findErr } = await supabase
      .from('participantes')
      .select('id, correo')
      .eq('id', id)
      .single();
    if (findErr || !participante) {
      return res.status(404).json({ error: 'Participación no encontrada.' });
    }

    const yaTeniaCredenciales = Boolean(participante.correo);

    const { error: updErr } = await supabase
      .from('participantes')
      .update({ correo, password })
      .eq('id', id);
    if (updErr) throw updErr;

    // Solo registramos el evento la primera vez (anti-duplicado accidental).
    if (!yaTeniaCredenciales) {
      await registrarEvento(id, 'credenciales');
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /participaciones/:id/credenciales', err);
    res.status(500).json({ error: 'No se pudieron guardar los datos.' });
  }
});

/**
 * POST /api/participaciones/:id/evento
 * Registra eventos 'continuacion' o 'finalizacion'.
 * Al finalizar, marca la participación como 'finalizado'.
 * Evita duplicar el mismo tipo de evento para una participación.
 */
router.post('/participaciones/:id/evento', async (req, res) => {
  try {
    const { id } = req.params;
    const tipo = req.body?.tipo;

    if (!['continuacion', 'finalizacion'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de evento no permitido.' });
    }

    const { data: participante, error: findErr } = await supabase
      .from('participantes')
      .select('id')
      .eq('id', id)
      .single();
    if (findErr || !participante) {
      return res.status(404).json({ error: 'Participación no encontrada.' });
    }

    // Anti-duplicado: ¿ya existe este tipo de evento para la participación?
    const { data: previos, error: prevErr } = await supabase
      .from('eventos')
      .select('id')
      .eq('participante_id', id)
      .eq('tipo_evento', tipo)
      .limit(1);
    if (prevErr) throw prevErr;

    if (!previos || previos.length === 0) {
      await registrarEvento(id, tipo);
    }

    if (tipo === 'finalizacion') {
      const { error: updErr } = await supabase
        .from('participantes')
        .update({ estado: 'finalizado' })
        .eq('id', id);
      if (updErr) throw updErr;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /participaciones/:id/evento', err);
    res.status(500).json({ error: 'No se pudo registrar el evento.' });
  }
});

export { router as publicRouter, TIPOS_EVENTO };
