import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000; // Use port 3000 as per guidelines

  app.use(cors());
  app.use(bodyParser.json());

  // API Routes
  app.use('/api', authRoutes);

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite Middleware (for development)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(__dirname, '..'), // Root is one level up
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, '../dist')));
    
    // Handle SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
