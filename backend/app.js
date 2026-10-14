import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { publicRouter } from './src/routes/public.js';
import { adminRouter } from './src/routes/admin.js';

dotenv.config();

const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Chequeo de salud
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Rutas públicas (participante) y administrativas (panel protegido)
app.use('/api', publicRouter);
app.use('/api/admin', adminRouter);

// 404 para rutas de API no encontradas
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

export default app;
