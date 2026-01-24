
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// O Render injeta automaticamente a variável PORT
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir os arquivos compilados pelo Vite
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback para Single Page Application (garante que F5 funcione em qualquer página)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📁 Servindo frontend da pasta: ${path.join(__dirname, 'dist')}`);
});
