import dotenv from 'dotenv';

dotenv.config();

/**
 * Protección administrativa sencilla.
 *
 * Como el panel /admin no tiene inicio de sesión, protegemos las
 * operaciones administrativas en el SERVIDOR con una clave compartida
 * que el frontend envía en la cabecera  x-admin-key.
 *
 * Esto evita exponer la clave privilegiada de Supabase y, a la vez,
 * impide que cualquier visitante consulte o modifique los datos
 * administrativos directamente desde la API.
 */
export function adminAuth(req, res, next) {
  const expected = process.env.ADMIN_KEY;

  // Si no se configuró ADMIN_KEY, bloqueamos por seguridad.
  if (!expected) {
    return res.status(500).json({
      error: 'El servidor no tiene configurada ADMIN_KEY.',
    });
  }

  const provided = req.header('x-admin-key');

  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  next();
}
