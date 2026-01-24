
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const distPath = path.join(__dirname, 'dist');

// Log para ajudar a debugar no Render caso a build falhe
if (!fs.existsSync(distPath)) {
  console.error("❌ ERRO: Pasta 'dist' não encontrada. Verifique se o 'Build Command' (npm run build) funcionou.");
} else {
  console.log("✅ Pasta 'dist' detectada com sucesso.");
}

app.use(express.static(distPath));

// Fallback para SPA (React Router / rotas internas)
// No Express 5, o uso de '*' ou '(.*)' em strings gera erro de "Missing parameter name".
// A forma mais segura e compatível é passar uma Expressão Regular (RegExp) diretamente.
app.get(/.*/, (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Erro: Arquivo index.html não encontrado na pasta dist. Certifique-se de que 'npm run build' foi executado.");
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Web Service Ativo na porta ${PORT}`);
  console.log(`📡 URL base: http://0.0.0.0:${PORT}`);
});
