import 'dotenv/config';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { connectMongoDB } from './config/db';
import authRouter from './routes/auth';
import catalogRouter from './routes/catalog';
import ordersRouter from './routes/order';
import agentRouter from './routes/agent';

const app = express();
const port = Number(process.env.PORT) || 4000;

const allowedOrigins = (
  process.env.FRONTEND_ORIGIN || 'http://localhost:3000'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
  })
);

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'omni-store-backend',
    database: 'mongodb',
  });
});

app.use('/api', authRouter);
app.use('/api', catalogRouter);
app.use('/api', ordersRouter);
app.use('/api', agentRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled backend error:', err);
  res.status(500).json({
    error: err instanceof Error ? err.message : 'Internal server error',
  });
});

async function startServer(): Promise<void> {
  try {
    await connectMongoDB();
    app.listen(port, () => {
      console.log(`omni-store-backend running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start omni-store-backend:', err);
    process.exit(1);
  }
}

startServer();