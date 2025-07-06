import { Router } from 'express';
import userRoutes from './user.routes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is running' });
});

router.use('/users', userRoutes);

export default router;
