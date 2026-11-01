import { Router } from 'express';
import { productController } from './controllers/product.controller.js';
import { validate } from '../../shared/middlewares/validate.js';
import { createProductSchema, listProductsSchema } from './models/schemas.js';
import { authenticate, authorize } from '../users/index.js';

export function createProductsRouter(): Router {
  const router = Router();

  router.get(
    '/products',
    validate(listProductsSchema, 'query'),
    (req, res, next) => productController.list(req, res, next)
  );

  router.get(
    '/products/:id',
    (req, res, next) => productController.getById(req, res, next)
  );

  // Admin-only create
  router.post(
    '/products',
    authenticate,
    authorize('ADMIN'),
    validate(createProductSchema),
    (req, res, next) => productController.create(req, res, next)
  );

  return router;
}