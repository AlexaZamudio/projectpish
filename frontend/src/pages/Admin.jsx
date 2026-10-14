import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import BarChart from '../components/BarChart.jsx';
import CobachLogo from '../components/CobachLogo.jsx';
import Icon from '../components/Icons.jsx';

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: 'barChart' },
  { id: 'registros', label: 'Registros', icon: 'list' },
  { id: 'estadisticas', label: 'Estadísticas', icon: 'activity' },
  { id: 'control', label: 'Control', icon: 'power' },
  { id: 'historial', label: 'Historial', icon: 'clock' },
];

const ETIQUETA_EVENTO = {
  acceso: 'Acceso a la página',
  credenciales: 'Credenciales ingresadas',
  continuacion: 'Intento de continuar',
  finalizacion: 'Finalización',
};

const ETIQUETA_ESTADO = { iniciado: 'Iniciado', finalizado: 'Finalizado' };

function fmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Admin() {
  const [tab, setTab] = useState('resumen');

  return (
    <div className="admin">
      <header className="admin-header">
        <CobachLogo size="lg" />
        <div className="admin-title">
          <h1>Panel del experimento</h1>
          <p className="muted">Simulación de phishing · Plantel Puerto Peñasco</p>
        </div>
      </header>

      <nav className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={17} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="admin-main">
        {tab === 'resumen' && <Resumen />}
        {tab === 'registros' && <Registros />}
        {tab === 'estadisticas' && <Estadisticas />}
        {tab === 'control' && <Control />}
        {tab === 'historial' && <Historial />}
      </main>
    </div>
  );
}

/* --------- Hook simple de carga con manejo de errores --------- */
function useCarga(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(() => {
    setCargando(true);
    setError('');
    fn()
      .then(setData)
      .catch((e) =>
        setError(e.status === 401 ? 'Clave administrativa incorrecta.' : e.message)
      )
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { data, error, cargando, recargar };
}

function EmptyState({ icon = 'inbox', titulo, texto }) {
  return (
    <div className="empty">
      <div className="empty-ico">
        <Icon name={icon} size={30} />
      </div>
      <strong>{titulo}</strong>
      {texto && <span className="muted">{texto}</span>}
    </div>
  );
}

function CopyBtn({ texto }) {
  const [copiado, setCopiado] = useState(false);
  if (!texto) return null;
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1200);
    } catch {
      /* clipboard no disponible */
    }
  }
  return (
    <button className={`copy-btn ${copiado ? 'ok' : ''}`} onClick={copiar} title="Copiar">
      <Icon name={copiado ? 'check' : 'copy'} size={14} />
    </button>
  );
}

function Estado({ cargando, error, onReintentar }) {
  if (cargando) return <p className="muted">Cargando…</p>;
  if (error)
    return (
      <div className="alert error">
        {error}
        {onReintentar && (
          <button className="btn-sm" onClick={onReintentar}>
            Reintentar
          </button>
        )}
      </div>
    );
  return null;
}

/* ---------------- Resumen (tarjetas) ---------------- */
function Resumen() {
  const { data, error, cargando, recargar } = useCarga(() => api.admin.resumen());

  const tarjetas = data
    ? [
        { label: 'Participantes registrados', valor: data.total_participantes, icon: 'users' },
        { label: 'Credenciales ingresadas', valor: data.total_credenciales, icon: 'key' },
        { label: 'Iniciaron la actividad', valor: data.total_iniciaron, icon: 'play' },
        { label: 'Completaron la actividad', valor: data.total_finalizaron, icon: 'check' },
        { label: 'Interacciones registradas', valor: data.total_interacciones, icon: 'activity' },
      ]
    : [];

  return (
    <section>
      <div className="section-head">
        <h2>Resumen general</h2>
        <button className="btn-sm" onClick={recargar}>
          Actualizar
        </button>
      </div>
      <Estado cargando={cargando} error={error} onReintentar={recargar} />
      {data && (
        <div className="cards">
          {tarjetas.map((t) => (
            <div className="card" key={t.label}>
              <div className="card-ico">
                <Icon name={t.icon} size={20} />
              </div>
              <div className="card-value">{t.valor}</div>
              <div className="card-label">{t.label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- Registros (tabla) ---------------- */
function Registros() {
  const { data, error, cargando, recargar } = useCarga(() => api.admin.registros());
  const [busqueda, setBusqueda] = useState('');
  const [ordenDesc, setOrdenDesc] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [msg, setMsg] = useState('');

  const registros = useMemo(() => {
    let r = data?.registros ? [...data.registros] : [];
    const q = busqueda.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (x) =>
          (x.correo || '').toLowerCase().includes(q) ||
          (x.password || '').toLowerCase().includes(q)
      );
    }
    r.sort((a, b) => {
      const diff = new Date(a.fecha_registro) - new Date(b.fecha_registro);
      return ordenDesc ? -diff : diff;
    });
    return r;
  }, [data, busqueda, ordenDesc]);

  async function exportarCsv() {
    setDescargando(true);
    setMsg('');
    try {
      const res = await fetch(api.admin.exportUrl, {
        headers: { 'x-admin-key': api.admin.adminKey },
      });
      if (!res.ok) throw new Error('No se pudo exportar.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'registros.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMsg(e.message || 'Error al exportar.');
    } finally {
      setDescargando(false);
    }
  }

  return (
    <section>
      <div className="section-head">
        <h2>Registros y credenciales</h2>
        <button className="btn-sm" onClick={recargar}>
          Actualizar
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Buscar por correo o contraseña…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button className="btn-sm" onClick={() => setOrdenDesc((v) => !v)}>
          Fecha {ordenDesc ? '↓ (recientes)' : '↑ (antiguas)'}
        </button>
        <button className="btn-primary btn-sm" onClick={exportarCsv} disabled={descargando}>
          {descargando ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </div>

      {msg && <div className="alert error">{msg}</div>}
      <Estado cargando={cargando} error={error} onReintentar={recargar} />

      {data && registros.length === 0 && (
        <EmptyState
          icon="inbox"
          titulo="Sin registros todavía"
          texto="Cuando un participante ingrese sus datos, aparecerá aquí."
        />
      )}

      {data && registros.length > 0 && (
        <>
          {/* Tabla con desplazamiento horizontal en pantallas grandes */}
          <div className="table-scroll desktop-only">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Correo</th>
                  <th>Contraseña</th>
                  <th>Fecha y hora</th>
                  <th>Estado</th>
                  <th>Interacción</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id}>
                    <td>{r.numero}</td>
                    <td>{r.correo || '—'}</td>
                    <td className="mono">
                      <span className="pw-cell">
                        {r.password || '—'}
                        <CopyBtn texto={r.password} />
                      </span>
                    </td>
                    <td>{fmtFecha(r.fecha_registro)}</td>
                    <td>
                      <span className={`badge ${r.estado}`}>
                        {ETIQUETA_ESTADO[r.estado] || r.estado}
                      </span>
                    </td>
                    <td>{ETIQUETA_EVENTO[r.ultima_interaccion] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas para celulares */}
          <div className="reg-cards mobile-only">
            {registros.map((r) => (
              <div className="reg-card" key={r.id}>
                <div className="reg-card-top">
                  <span className="reg-num">#{r.numero}</span>
                  <span className={`badge ${r.estado}`}>
                    {ETIQUETA_ESTADO[r.estado] || r.estado}
                  </span>
                </div>
                <div className="reg-row">
                  <span className="k">Correo</span>
                  <span className="v">{r.correo || '—'}</span>
                </div>
                <div className="reg-row">
                  <span className="k">Contraseña</span>
                  <span className="v mono pw-cell">
                    {r.password || '—'}
                    <CopyBtn texto={r.password} />
                  </span>
                </div>
                <div className="reg-row">
                  <span className="k">Fecha</span>
                  <span className="v">{fmtFecha(r.fecha_registro)}</span>
                </div>
                <div className="reg-row">
                  <span className="k">Interacción</span>
                  <span className="v">{ETIQUETA_EVENTO[r.ultima_interaccion] || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ---------------- Estadísticas (gráficas) ---------------- */
function Estadisticas() {
  const { data, error, cargando, recargar } = useCarga(() => api.admin.estadisticas());

  const embudo = data
    ? [
        { label: 'Abrieron', value: data.participantes_unicos.abrieron },
        { label: 'Credenciales', value: data.participantes_unicos.credenciales },
        { label: 'Continuaron', value: data.participantes_unicos.continuaron },
        { label: 'Finalizaron', value: data.participantes_unicos.finalizaron },
      ]
    : [];

  const distribucion = data
    ? [
        { label: 'Acceso', value: data.distribucion_interacciones.acceso },
        { label: 'Credenciales', value: data.distribucion_interacciones.credenciales },
        { label: 'Continuación', value: data.distribucion_interacciones.continuacion },
        { label: 'Finalización', value: data.distribucion_interacciones.finalizacion },
      ]
    : [];

  return (
    <section>
      <div className="section-head">
        <h2>Resultados del experimento</h2>
        <button className="btn-sm" onClick={recargar}>
          Actualizar
        </button>
      </div>
      <Estado cargando={cargando} error={error} onReintentar={recargar} />

      {data && (
        <div className="charts">
          <div className="chart-card">
            <h3>Embudo de participación</h3>
            <p className="chart-sub muted">Participantes únicos en cada etapa (% respecto a quienes abrieron)</p>
            <BarChart data={embudo} baseline={embudo[0]?.value || 0} />
          </div>
          <div className="chart-card">
            <h3>Distribución de interacciones</h3>
            <p className="chart-sub muted">Total de eventos registrados por tipo</p>
            <BarChart data={distribucion} />
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- Control de la actividad ---------------- */
function Control() {
  const { data, error, cargando, recargar } = useCarga(() => api.admin.config());
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  async function cambiar(nuevoEstado) {
    setGuardando(true);
    setMsg('');
    try {
      await api.admin.setConfig(nuevoEstado);
      setMsg(nuevoEstado ? 'Actividad habilitada.' : 'Actividad cerrada.');
      recargar();
    } catch (e) {
      setMsg(e.message || 'No se pudo actualizar.');
    } finally {
      setGuardando(false);
    }
  }

  const activa = data?.actividad_activa;

  return (
    <section>
      <div className="section-head">
        <h2>Control de la actividad</h2>
        <button className="btn-sm" onClick={recargar}>
          Actualizar
        </button>
      </div>
      <Estado cargando={cargando} error={error} onReintentar={recargar} />

      {data && (
        <div className="control-box">
          <div className="control-status">
            Estado actual:{' '}
            <span className={`badge ${activa ? 'finalizado' : 'iniciado'}`}>
              {activa ? 'Habilitada' : 'Cerrada'}
            </span>
          </div>
          <p className="muted">
            Última actualización: {fmtFecha(data.fecha_actualizacion)}
          </p>

          <div className="control-actions">
            <button
              className="btn-primary"
              onClick={() => cambiar(true)}
              disabled={guardando || activa}
            >
              <Icon name="play" size={16} /> Habilitar actividad
            </button>
            <button
              className="btn-danger"
              onClick={() => cambiar(false)}
              disabled={guardando || !activa}
            >
              <Icon name="power" size={16} /> Cerrar actividad
            </button>
          </div>

          {msg && <div className="alert info">{msg}</div>}
          <p className="muted small">
            Cuando la actividad está cerrada, los participantes ven un mensaje indicando que
            no está disponible.
          </p>
        </div>
      )}
    </section>
  );
}

/* ---------------- Historial de interacciones ---------------- */
function Historial() {
  const { data, error, cargando, recargar } = useCarga(() => api.admin.eventos());
  const eventos = data?.eventos ?? [];

  return (
    <section>
      <div className="section-head">
        <h2>Historial de interacciones</h2>
        <button className="btn-sm" onClick={recargar}>
          Actualizar
        </button>
      </div>
      <Estado cargando={cargando} error={error} onReintentar={recargar} />

      {data && eventos.length === 0 && (
        <EmptyState
          icon="clock"
          titulo="Sin eventos todavía"
          texto="Aquí se listarán los accesos, credenciales y finalizaciones."
        />
      )}

      {data && eventos.length > 0 && (
        <ul className="timeline">
          {eventos.map((e) => (
            <li key={e.id}>
              <div className="tl-dot" />
              <div className="tl-body">
                <div className="tl-title">
                  {ETIQUETA_EVENTO[e.tipo_evento] || e.tipo_evento}
                  {e.participante_numero && (
                    <span className="tl-part"> · Participante #{e.participante_numero}</span>
                  )}
                </div>
                <div className="tl-date muted">{fmtFecha(e.fecha_evento)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
