import { Router } from 'express';
import { supabase } from '../supabase.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

// Todas las rutas de este router requieren la clave administrativa.
router.use(adminAuth);

const TIPOS = ['acceso', 'credenciales', 'continuacion', 'finalizacion'];

// Trae todos los participantes y todos los eventos (volumen escolar: OK en memoria).
async function cargarDatos() {
  const [{ data: participantes, error: pErr }, { data: eventos, error: eErr }] =
    await Promise.all([
      supabase
        .from('participantes')
        .select('id, correo, password, estado, fecha_registro')
        .order('fecha_registro', { ascending: false }),
      supabase
        .from('eventos')
        .select('id, participante_id, tipo_evento, fecha_evento')
        .order('fecha_evento', { ascending: false }),
    ]);

  if (pErr) throw pErr;
  if (eErr) throw eErr;
  return { participantes: participantes ?? [], eventos: eventos ?? [] };
}

/**
 * GET /api/admin/resumen
 * Tarjetas del dashboard, calculadas a partir de datos reales.
 */
router.get('/resumen', async (_req, res) => {
  try {
    const { participantes, eventos } = await cargarDatos();

    const totalParticipantes = participantes.length;
    const totalCredenciales = participantes.filter((p) => p.correo).length;
    const totalFinalizados = participantes.filter((p) => p.estado === 'finalizado').length;

    const iniciaronIds = new Set(
      eventos.filter((e) => e.tipo_evento === 'acceso').map((e) => e.participante_id)
    );

    res.json({
      total_participantes: totalParticipantes,
      total_credenciales: totalCredenciales,
      total_iniciaron: iniciaronIds.size,
      total_finalizaron: totalFinalizados,
      total_interacciones: eventos.length,
    });
  } catch (err) {
    console.error('GET /admin/resumen', err);
    res.status(500).json({ error: 'No se pudo calcular el resumen.' });
  }
});

/**
 * GET /api/admin/registros
 * Tabla de registros y credenciales. Devuelve cada participación con
 * su número, correo, contraseña, fecha, estado y la última interacción.
 */
router.get('/registros', async (_req, res) => {
  try {
    const { participantes, eventos } = await cargarDatos();

    // Ordena ascendente por fecha para asignar "número de registro" estable.
    const asc = [...participantes].sort(
      (a, b) => new Date(a.fecha_registro) - new Date(b.fecha_registro)
    );
    const numeroPorId = new Map(asc.map((p, i) => [p.id, i + 1]));

    // Última interacción por participante (eventos ya vienen desc por fecha).
    const ultimoEvento = new Map();
    for (const e of eventos) {
      if (!ultimoEvento.has(e.participante_id)) {
        ultimoEvento.set(e.participante_id, e.tipo_evento);
      }
    }

    const registros = participantes.map((p) => ({
      id: p.id,
      numero: numeroPorId.get(p.id),
      correo: p.correo,
      password: p.password,
      fecha_registro: p.fecha_registro,
      estado: p.estado,
      ultima_interaccion: ultimoEvento.get(p.id) ?? null,
    }));

    res.json({ registros });
  } catch (err) {
    console.error('GET /admin/registros', err);
    res.status(500).json({ error: 'No se pudieron consultar los registros.' });
  }
});

/**
 * GET /api/admin/estadisticas
 * Datos para las gráficas. Cuenta participantes ÚNICOS por categoría
 * (sin contar a un mismo participante dos veces).
 */
router.get('/estadisticas', async (_req, res) => {
  try {
    const { eventos } = await cargarDatos();

    // Participantes únicos por tipo de evento.
    const unicosPorTipo = Object.fromEntries(TIPOS.map((t) => [t, new Set()]));
    // Conteo total de interacciones por tipo (distribución).
    const conteoPorTipo = Object.fromEntries(TIPOS.map((t) => [t, 0]));

    for (const e of eventos) {
      if (!TIPOS.includes(e.tipo_evento)) continue;
      conteoPorTipo[e.tipo_evento] += 1;
      if (e.participante_id) unicosPorTipo[e.tipo_evento].add(e.participante_id);
    }

    res.json({
      // Embudo de participantes únicos
      participantes_unicos: {
        abrieron: unicosPorTipo.acceso.size,
        credenciales: unicosPorTipo.credenciales.size,
        continuaron: unicosPorTipo.continuacion.size,
        finalizaron: unicosPorTipo.finalizacion.size,
      },
      // Distribución de interacciones registradas
      distribucion_interacciones: {
        acceso: conteoPorTipo.acceso,
        credenciales: conteoPorTipo.credenciales,
        continuacion: conteoPorTipo.continuacion,
        finalizacion: conteoPorTipo.finalizacion,
      },
    });
  } catch (err) {
    console.error('GET /admin/estadisticas', err);
    res.status(500).json({ error: 'No se pudieron calcular las estadísticas.' });
  }
});

/**
 * GET /api/admin/eventos
 * Historial de interacciones con fecha y participante asociado.
 */
router.get('/eventos', async (_req, res) => {
  try {
    const { participantes, eventos } = await cargarDatos();
    const asc = [...participantes].sort(
      (a, b) => new Date(a.fecha_registro) - new Date(b.fecha_registro)
    );
    const numeroPorId = new Map(asc.map((p, i) => [p.id, i + 1]));

    const historial = eventos.map((e) => ({
      id: e.id,
      participante_id: e.participante_id,
      participante_numero: numeroPorId.get(e.participante_id) ?? null,
      tipo_evento: e.tipo_evento,
      fecha_evento: e.fecha_evento,
    }));

    res.json({ eventos: historial });
  } catch (err) {
    console.error('GET /admin/eventos', err);
    res.status(500).json({ error: 'No se pudo consultar el historial.' });
  }
});

/**
 * GET /api/admin/export
 * Exporta los registros a un archivo CSV.
 */
router.get('/export', async (_req, res) => {
  try {
    const { participantes } = await cargarDatos();
    const asc = [...participantes].sort(
      (a, b) => new Date(a.fecha_registro) - new Date(b.fecha_registro)
    );

    const encabezado = ['Numero', 'Correo', 'Password', 'Fecha_registro', 'Estado'];
    const escapar = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const filas = asc.map((p, i) =>
      [i + 1, p.correo ?? '', p.password ?? '', p.fecha_registro, p.estado]
        .map(escapar)
        .join(',')
    );

    const csv = [encabezado.join(','), ...filas].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="registros.csv"');
    res.send('﻿' + csv); // BOM para que Excel abra bien los acentos.
  } catch (err) {
    console.error('GET /admin/export', err);
    res.status(500).json({ error: 'No se pudo exportar.' });
  }
});

/**
 * GET /api/admin/config  -> estado de la actividad
 * PUT /api/admin/config  -> habilitar o cerrar la actividad
 */
router.get('/config', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('configuracion')
      .select('actividad_activa, fecha_actualizacion')
      .eq('id', 1)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET /admin/config', err);
    res.status(500).json({ error: 'No se pudo consultar la configuración.' });
  }
});

router.put('/config', async (req, res) => {
  try {
    const activa = req.body?.actividad_activa;
    if (typeof activa !== 'boolean') {
      return res.status(400).json({ error: 'actividad_activa debe ser booleano.' });
    }

    const { data, error } = await supabase
      .from('configuracion')
      .update({ actividad_activa: activa, fecha_actualizacion: new Date().toISOString() })
      .eq('id', 1)
      .select('actividad_activa, fecha_actualizacion')
      .single();
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('PUT /admin/config', err);
    res.status(500).json({ error: 'No se pudo actualizar la configuración.' });
  }
});

export { router as adminRouter };
