import { Router } from 'express';
import grRoutes from './gr.js';
import tripExpensesRoutes from './tripExpenses.js';

const router = Router();

router.use('/gr', grRoutes);
router.use('/tripExpenses', tripExpensesRoutes);

export default router;