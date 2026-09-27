import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Routes
import ticketRoutes from './routes/ticketRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import motorcycleRoutes from './routes/motorcycleRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import profileRoutes from './routes/profileRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// 1. Middlewares
app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// 2. Health Check & Root API
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'MotoCare Backend API Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// 3. API Route Registrations
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/motorcycles', motorcycleRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);

// 4. 404 Not Found Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API route not found.',
  });
});

// 5. Global Error Handling Middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred on the server.',
  });
});

// 6. Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 MotoCare Node.js API Server is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🛡️  CORS allowed origin: ${CLIENT_ORIGIN}`);
  console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});
