import 'dotenv/config';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { connectMongoDB } from './config/db';
import { Store } from './models/Store';
import { Product } from './models/Product';
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

async function seedInitialData(): Promise<void> {
  const stores = [
    {
      _id: 'hyderabad',
      name: 'OmniStore Hyderabad Hub',
      cityLabel: 'Hyderabad',
      address: 'Hitech City Main Rd, Madhapur, Hyderabad',
    },
    {
      _id: 'bengaluru',
      name: 'OmniStore Bengaluru Hub',
      cityLabel: 'Bengaluru',
      address: '100 Feet Rd, Indiranagar, Bengaluru',
    },
    {
      _id: 'mumbai',
      name: 'OmniStore Mumbai Hub',
      cityLabel: 'Mumbai',
      address: 'Linking Rd, Bandra West, Mumbai',
    },
    {
      _id: 'delhi',
      name: 'OmniStore Delhi Hub',
      cityLabel: 'Delhi',
      address: 'Connaught Place, New Delhi',
    },
  ] as const;

  for (const store of stores) {
    await Store.updateOne(
      { _id: store._id },
      { $setOnInsert: store },
      { upsert: true }
    );
  }

  const products = [
    {
      id: 'prod-1',
      name: 'Wireless ANC Studio Headphones',
      category: 'Audio',
      price: 7499,
      description:
        'Active noise-cancelling over-ear headphones with 40-hour battery life.',
      imageUrl: '/images/headphones.jpg',
      storeInventory: {
        hyderabad: { quantity: 14, status: 'in_stock' },
        bengaluru: { quantity: 4, status: 'low_stock' },
        mumbai: { quantity: 0, status: 'out_of_stock' },
        delhi: { quantity: 9, status: 'in_stock' },
      },
    },
    {
      id: 'prod-2',
      name: 'Mechanical Compact Keyboard',
      category: 'Accessories',
      price: 5999,
      description:
        'Hot-swappable 75% mechanical keyboard with tactile switches.',
      imageUrl: '/images/keyboard.jpg',
      storeInventory: {
        hyderabad: { quantity: 3, status: 'low_stock' },
        bengaluru: { quantity: 18, status: 'in_stock' },
        mumbai: { quantity: 7, status: 'in_stock' },
        delhi: { quantity: 0, status: 'out_of_stock' },
      },
    },
  ];

  for (const product of products) {
    await Product.updateOne(
      { id: product.id },
      { $setOnInsert: product },
      { upsert: true }
    );
  }
}

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
    await seedInitialData();
    app.listen(port, () => {
      console.log(`omni-store-backend running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start omni-store-backend:', err);
    process.exit(1);
  }
}

startServer();