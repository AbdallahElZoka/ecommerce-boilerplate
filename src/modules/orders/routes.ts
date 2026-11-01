import { Router } from 'express';
import { orderController } from './controllers/order.controller.js';
import { validate } from '../../shared/middlewares/validate.js';
import { createOrderSchema } from './models/schemas.js';
import { authenticate } from '../users/index.js';

export function createOrdersRouter(): Router {
  const router = Router();

  // All order routes require authentication (
  // identity comes solely from users module's authenticate middleware.
  router.post(
    '/orders',
    authenticate,
    validate(createOrderSchema),
    (req, res, next) => orderController.create(req, res, next)
  );

  router.get(
    '/orders/me',
    authenticate,
    (req, res, next) => orderController.listMine(req, res, next)
  );

  router.get(
    '/orders/me/:id',
    authenticate,
    (req, res, next) => orderController.getMine(req, res, next)
  );

  return router;
}