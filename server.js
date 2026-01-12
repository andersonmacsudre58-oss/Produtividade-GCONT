
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

// Inicializa o arquivo de banco de dados se não existir
if (!fs.existsSync(DB_PATH)) {
  console.log('Iniciando novo banco de dados local...');
  fs.writeFileSync(DB_PATH, JSON.stringify({
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
  }, null, 2));
}

// API: Buscar estado atual
app.get('/api/state', (req, res) => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  } catch (error) {
    console.error('Erro ao ler DB:', error);
    res.status(500).json({ error: 'Erro ao ler banco de dados' });
  }
});

// API: Salvar novo estado
app.post('/api/state', (req, res) => {
  try {
    const newState = req.body;
    if (!newState || typeof newState !== 'object') {
      return res.status(400).json({ error: 'Dados inválidos' });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(newState, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar DB:', error);
    res.status(500).json({ error: 'Erro ao salvar dados' });
  }
});

// Serve arquivos estáticos da build do React
// Certifique-se de que a pasta 'dist' existe antes de tentar servir
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

// Fallback para SPA (Single Page Application)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
  } else {
      res.status(404).send('Aplicação não encontrada. Execute npm run build primeiro.');
  }
});

app.listen(PORT, () => {
  console.log(`>>> Prod360 Online na porta ${PORT}`);
  console.log(`>>> Banco de dados em: ${DB_PATH}`);
});
