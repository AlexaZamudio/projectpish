import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import CobachLogo from '../components/CobachLogo.jsx';
import Icon from '../components/Icons.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Participante() {
  // Pasos: cargando | cerrada | intro | login | verificando | hackeo | final | error
  const [paso, setPaso] = useState('cargando');
  const [participacionId, setParticipacionId] = useState(null);

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errorCampo, setErrorCampo] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Al montar: consulta si la actividad está habilitada.
  useEffect(() => {
    let activo = true;
    api
      .estadoActividad()
      .then((r) => {
        if (!activo) return;
        setPaso(r.actividad_activa ? 'intro' : 'cerrada');
      })
      .catch(() => activo && setPaso('cerrada'));
    return () => {
      activo = false;
    };
  }, []);

  // Comenzar: crea la participación (evento 'acceso') y pasa al login.
  async function comenzar() {
    setEnviando(true);
    try {
      const { id } = await api.iniciarParticipacion();
      setParticipacionId(id);
      setPaso('login');
    } catch (err) {
      setPaso(err.status === 403 ? 'cerrada' : 'error');
    } finally {
      setEnviando(false);
    }
  }

  // Envío del formulario de inicio de sesión simulado.
  async function enviarCredenciales(e) {
    e.preventDefault();
    setErrorCampo('');

    const correoLimpio = correo.trim();
    if (!correoLimpio || !password) {
      setErrorCampo('Ingresa tu correo y tu contraseña.');
      return;
    }
    if (!EMAIL_RE.test(correoLimpio)) {
      setErrorCampo('El formato del correo no es válido.');
      return;
    }

    setEnviando(true);
    try {
      await api.guardarCredenciales(participacionId, correoLimpio, password);
      setPaso('verificando');

      // Breve verificación simulada; luego registra 'continuacion' y
      // muestra la pantalla de "hackeo" antes de revelar la info educativa.
      setTimeout(async () => {
        try {
          await api.registrarEvento(participacionId, 'continuacion');
        } catch {
          /* no bloquea el flujo */
        }
        setPaso('hackeo');
      }, 1600);
    } catch (err) {
      if (err.status === 403) {
        setPaso('cerrada');
      } else {
        setErrorCampo(err.message || 'No se pudo continuar.');
      }
    } finally {
      setEnviando(false);
    }
  }

  // Al llegar a la pantalla final, registra 'finalizacion'.
  useEffect(() => {
    if (paso === 'final' && participacionId) {
      api.registrarEvento(participacionId, 'finalizacion').catch(() => {});
    }
  }, [paso, participacionId]);

  return (
    <div className="part-wrap">
      {paso === 'cargando' && <Cargando />}
      {paso === 'cerrada' && <Cerrada />}
      {paso === 'error' && <ErrorGenerico onReintentar={() => window.location.reload()} />}
      {paso === 'intro' && <Intro onComenzar={comenzar} enviando={enviando} />}
      {paso === 'login' && (
        <Login
          correo={correo}
          password={password}
          setCorreo={setCorreo}
          setPassword={setPassword}
          onSubmit={enviarCredenciales}
          error={errorCampo}
          enviando={enviando}
        />
      )}
      {paso === 'verificando' && <Verificando />}
      {paso === 'hackeo' && (
        <Hackeo correo={correo} onDone={() => setPaso('final')} />
      )}
      {paso === 'final' && <Final correo={correo} password={password} />}
    </div>
  );
}

/* ---------------- Pantallas ---------------- */

function Cargando() {
  return (
    <div className="part-card center">
      <div className="spinner" />
      <p className="muted">Cargando…</p>
    </div>
  );
}

function Cerrada() {
  return (
    <div className="part-card center">
      <div className="emoji">🔒</div>
      <h1>Actividad no disponible</h1>
      <p className="muted">
        Esta actividad no está disponible en este momento. Si crees que es un error,
        contacta a la persona responsable del ejercicio.
      </p>
    </div>
  );
}

function ErrorGenerico({ onReintentar }) {
  return (
    <div className="part-card center">
      <div className="emoji">⚠️</div>
      <h1>Algo salió mal</h1>
      <p className="muted">No pudimos iniciar la actividad.</p>
      <button className="btn-primary" onClick={onReintentar}>
        Reintentar
      </button>
    </div>
  );
}

function Intro({ onComenzar, enviando }) {
  return (
    <div className="part-card center fade-in">
      <CobachLogo size="lg" />
      <div className="wifi-icon big float">
        <WifiIcon />
      </div>
      <h1>WiFi Estudiantes COBACH</h1>
      <p className="plantel">Plantel Puerto Peñasco</p>
      <p className="muted">
        Se requiere iniciar sesión para usar esta red. Continúa para acceder a Internet.
      </p>
      <button className="btn-primary pop" onClick={onComenzar} disabled={enviando}>
        {enviando ? 'Un momento…' : 'Iniciar sesión en la red'}
      </button>
    </div>
  );
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" aria-hidden="true">
      <path
        d="M12 18.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"
        fill="currentColor"
      />
      <path
        d="M4.2 11.1a11 11 0 0 1 15.6 0M7 13.9a7 7 0 0 1 10 0M9.6 16.6a3.3 3.3 0 0 1 4.8 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SignalBars() {
  return (
    <span className="signal" aria-hidden="true">
      <i style={{ height: '5px' }} />
      <i style={{ height: '8px' }} />
      <i style={{ height: '11px' }} />
      <i style={{ height: '14px' }} />
    </span>
  );
}

function Login({ correo, password, setCorreo, setPassword, onSubmit, error, enviando }) {
  const [verPass, setVerPass] = useState(false);

  return (
    <div className="part-card wifi fade-in">
      <div className="wifi-top">
        <div className="wifi-icon">
          <WifiIcon />
        </div>
        <div className="wifi-net">
          <span className="wifi-label">Red conectada</span>
          <strong>WiFi Estudiantes COBACH</strong>
          <span className="wifi-sub">Plantel Puerto Peñasco</span>
        </div>
        <SignalBars />
      </div>

      <div className="wifi-body">
        <CobachLogo />

        <div className="wifi-head">
          <h1>Acceso a Internet</h1>
          <p className="muted">
            Inicia sesión con tu cuenta institucional para navegar en la red.
          </p>
        </div>

        <form onSubmit={onSubmit} className="login-form" noValidate>
          <label>
            Correo institucional
            <span className="input-group">
              <Icon name="mail" size={18} className="input-ico" />
              <input
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="usuario@bachilleresdesonora.edu.mx"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </span>
          </label>

          <label>
            Contraseña
            <span className="input-group">
              <Icon name="lock" size={18} className="input-ico" />
              <input
                type={verPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="pass-toggle"
                onClick={() => setVerPass((v) => !v)}
                aria-label={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <Icon name={verPass ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </span>
          </label>

          {error && (
            <div className="form-error">
              <Icon name="shield" size={15} /> {error}
            </div>
          )}

          <button type="submit" className="btn-primary full" disabled={enviando}>
            {enviando ? 'Conectando…' : 'Conectar a la red'}
          </button>

          <div className="secure-chip">
            <Icon name="lock" size={13} /> Conexión protegida · COBACH Sonora
          </div>

          <p className="wifi-terms muted">
            Al conectarte aceptas la política de uso de la red escolar.
          </p>
        </form>
      </div>
    </div>
  );
}

function Verificando() {
  return (
    <div className="part-card center fade-in">
      <div className="wifi-icon big pulse">
        <WifiIcon />
      </div>
      <h1>Conectando a la red…</h1>
      <p className="muted">Autenticando tu cuenta institucional</p>
      <div className="progress">
        <div className="progress-bar" />
      </div>
    </div>
  );
}

function Hackeo({ correo, onDone }) {
  const LINEAS = [
    'Estableciendo conexión con el host remoto...',
    'root@cobach:~$ acceso concedido',
    `Objetivo identificado: ${correo || 'usuario@desconocido'}`,
    'Extrayendo credenciales almacenadas...',
    'Contraseña copiada ████████  [ OK ]',
    'Accediendo a correo institucional...',
    'Descargando 1,284 contactos...  [ OK ]',
    'Sincronizando fotos y archivos...  98%',
    'Activando cámara frontal...',
    'Rastreando ubicación del dispositivo...',
  ];
  const [n, setN] = useState(0);
  const [fin, setFin] = useState(false);
  const [mute, setMute] = useState(false);
  const ctxRef = useRef(null);
  const muteRef = useRef(false);

  useEffect(() => {
    muteRef.current = mute;
  }, [mute]);

  useEffect(() => {
    // AudioContext: el clic previo en "Conectar" habilita el audio.
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new AC();
      ctxRef.current.resume?.();
    } catch {
      ctxRef.current = null;
    }

    // Un beep corto (tono que sube con cada línea).
    const blip = (freq, dur = 0.08, type = 'square', vol = 0.05) => {
      const ctx = ctxRef.current;
      if (!ctx || muteRef.current) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur);
    };

    // Alarma tipo sirena al detectar la "brecha".
    const alarma = () => {
      const ctx = ctxRef.current;
      if (!ctx || muteRef.current) return;
      let t = ctx.currentTime;
      for (let k = 0; k < 6; k++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(k % 2 ? 480 : 900, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.085, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.32);
        t += 0.32;
      }
    };

    let i = 0;
    blip(180, 0.06, 'sawtooth');
    const id = setInterval(() => {
      i += 1;
      setN(i);
      blip(160 + i * 65);
      if (i >= LINEAS.length) {
        clearInterval(id);
        setFin(true);
        alarma();
        setTimeout(onDone, 2400);
      }
    }, 620);

    return () => {
      clearInterval(id);
      try {
        ctxRef.current?.close?.();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progreso = Math.min(100, Math.round((n / LINEAS.length) * 100));

  return (
    <div className={`hack-screen ${fin ? 'breach' : ''}`}>
      <div className="hack-scan" />
      <div className="hack-top">
        <span className="hack-dot" /> CONEXIÓN NO SEGURA · ACCESO REMOTO
        <button
          className="hack-mute"
          onClick={() => setMute((m) => !m)}
          aria-label={mute ? 'Activar sonido' : 'Silenciar'}
        >
          {mute ? '🔇' : '🔊'}
        </button>
      </div>

      <pre className="hack-term">
        {LINEAS.slice(0, n).map((l, i) => (
          <div key={i} className="hack-line">
            <span className="hack-prompt">&gt;</span> {l}
          </div>
        ))}
        {!fin && <span className="hack-cursor">█</span>}
      </pre>

      <div className="hack-progress">
        <div className="hack-progress-bar" style={{ width: `${progreso}%` }} />
      </div>
      <div className="hack-progress-txt">Robando datos… {progreso}%</div>

      {fin && (
        <div className="hack-breach">
          <div className="glitch" data-txt="SISTEMA COMPROMETIDO">
            SISTEMA COMPROMETIDO
          </div>
          <div className="hack-skull">💀</div>
        </div>
      )}
    </div>
  );
}

const SENIALES = [
  {
    icon: '🌐',
    titulo: 'La dirección (URL) no coincidía',
    texto:
      'Un portal real del colegio no te pide tu contraseña en una página cualquiera. Revisa siempre que el dominio sea el oficial y no tenga letras raras o cambiadas.',
  },
  {
    icon: '⏱️',
    titulo: 'Te pedían datos para "seguir navegando"',
    texto:
      'El sentido de urgencia ("conéctate ya", "verifica tu cuenta") es una táctica para que no te detengas a pensar.',
  },
  {
    icon: '🔑',
    titulo: 'Pedía tu contraseña real',
    texto:
      'Para dar WiFi casi nunca se necesita tu contraseña de correo. Si una red te la pide, desconfía.',
  },
  {
    icon: '🔒',
    titulo: 'El candado no garantiza nada',
    texto:
      'Que una página tenga candado (https) solo significa que la conexión va cifrada, no que el sitio sea confiable.',
  },
];

const PASOS_ACCION = [
  'Cambia ahora la contraseña que escribiste (y en todo sitio donde la repitas).',
  'Activa la verificación en dos pasos en tu correo.',
  'No uses la misma contraseña en varias cuentas.',
];

function DatosCapturados({ correo, password }) {
  const [verPass, setVerPass] = useState(false);
  return (
    <div className="capturado">
      <div className="capturado-head">
        <Icon name="shield" size={18} />
        <span>Esto fue lo que la página falsa capturó de ti:</span>
      </div>
      <div className="capturado-fila">
        <Icon name="mail" size={16} className="capturado-ico" />
        <span className="capturado-dato">{correo || '—'}</span>
      </div>
      <div className="capturado-fila">
        <Icon name="lock" size={16} className="capturado-ico" />
        <span className="capturado-dato mono">
          {verPass ? password || '—' : '•'.repeat(Math.max((password || '').length, 6))}
        </span>
        <button className="capturado-ver" onClick={() => setVerPass((v) => !v)}>
          <Icon name={verPass ? 'eyeOff' : 'eye'} size={15} />
          {verPass ? 'Ocultar' : 'Ver'}
        </button>
      </div>
      <p className="capturado-nota">
        Un atacante real ya tendría estos datos. Por eso nunca los escribas en páginas en
        las que no confíes.
      </p>
    </div>
  );
}

function Acordeon({ item, abierto, onToggle }) {
  return (
    <div className={`acc ${abierto ? 'open' : ''}`}>
      <button className="acc-head" onClick={onToggle}>
        <span className="acc-emoji">{item.icon}</span>
        <span className="acc-titulo">{item.titulo}</span>
        <span className="acc-chevron">{abierto ? '−' : '+'}</span>
      </button>
      <div className="acc-body">
        <p>{item.texto}</p>
      </div>
    </div>
  );
}

function Final({ correo, password }) {
  const [abierto, setAbierto] = useState(0);

  return (
    <div className="part-card fade-in">
      <CobachLogo />
      <div className="emoji center-block bounce">🎣</div>
      <h1 className="center-txt">¡Fue una simulación de phishing!</h1>
      <p className="muted center-txt">
        Acabas de participar en un ejercicio educativo del COBACH. No pasó nada malo con
        tus datos: se usaron solo para esta práctica de concientización.
      </p>

      <DatosCapturados correo={correo} password={password} />

      <h2 className="final-sub">
        <Icon name="activity" size={18} /> Señales que lo delataban
      </h2>
      <p className="final-hint muted">Toca cada una para saber más</p>
      <div className="acordeones">
        {SENIALES.map((s, i) => (
          <Acordeon
            key={i}
            item={s}
            abierto={abierto === i}
            onToggle={() => setAbierto(abierto === i ? -1 : i)}
          />
        ))}
      </div>

      <h2 className="final-sub">
        <Icon name="check" size={18} /> ¿Qué hacer ahora?
      </h2>
      <ol className="pasos">
        {PASOS_ACCION.map((p, i) => (
          <li key={i} style={{ animationDelay: `${i * 0.08}s` }}>
            <span className="paso-num">{i + 1}</span>
            {p}
          </li>
        ))}
      </ol>

      <p className="muted center-txt small">Gracias por participar. Ya puedes cerrar esta página.</p>
    </div>
  );
}
