// Función serverless de Vercel: expone la app de Express en /api/*
// (Vercel reescribe /api/(.*) hacia esta función; ver vercel.json).
import app from '../backend/app.js';

export default app;
