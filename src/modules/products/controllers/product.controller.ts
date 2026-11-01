import type { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service.js';
import type { CreateProductInput, ListProductsInput } from '../models/schemas.js';

export class ProductController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = req.query as unknown as ListProductsInput;
      const result = await productService.list(params);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.getById(req.params.id!);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateProductInput;
      const product = await productService.create(input);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }
}

export const productController = new ProductController();