// Arranque LOCAL del backend (en Vercel se usa /api/index.js como función).
import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n  Backend escuchando en http://localhost:${PORT}\n`);
});
