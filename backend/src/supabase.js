import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '\n[ERROR] Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el archivo .env\n' +
      'Copia backend/.env.example a backend/.env y completa los valores.\n'
  );
}

// Cliente con SERVICE ROLE: solo se usa en el servidor, nunca en el frontend.
export const supabase = createClient(
  SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY ?? '',
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);
