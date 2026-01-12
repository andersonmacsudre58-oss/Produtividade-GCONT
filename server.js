
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Inicializa o banco de dados se não existir
const initialData = {
  people: [],
  tasks: [],
  serviceCategories: [
    { id: '1', name: 'Serviços Médicos', color: '#ef4444' },
    { id: '2', name: 'Manutenção (Corretiva/Preventiva)', color: '#f59e0b' },
    { id: '3', name: 'Diária', color: '#10b981' },
    { id: '4', name: 'Licitação/Contrato', color: '#3b82f6' },
    { id: '5', name: 'Materiais', color: '#8b5cf6' }
  ],
  userRole: 'master'
};

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
}

// API: Buscar estado
app.get('/api/state', (req, res) => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler dados' });
  }
});

// API: Salvar estado
app.post('/api/state', (req, res) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar dados' });
  }
});

// CRUCIAL: Serve os arquivos estáticos da pasta 'dist' (gerada pelo npm run build)
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback para SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
