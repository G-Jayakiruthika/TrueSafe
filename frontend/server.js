import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const dir = path.dirname(fileURLToPath(import.meta.url));
const target = process.env.API_TARGET || 'http://localhost:8080';
const app = express();

app.use(createProxyMiddleware({
  target,
  changeOrigin: true,
  pathFilter: '/api',
}));

app.use(express.static(path.join(dir, 'dist')));
app.use((_req, res) => res.sendFile(path.join(dir, 'dist', 'index.html')));

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Frontend running on port ${port}, proxying /api to ${target}`);
});
