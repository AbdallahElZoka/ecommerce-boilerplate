import type { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service.js';
import type { CreateOrderInput } from '../models/schemas.js';

export class OrderController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
        return;
      }
      const input = req.body as CreateOrderInput;
      const order = await orderService.create(req.user.id, input);
      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
        return;
      }
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await orderService.listForUser(req.user.id, page, limit);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
        return;
      }
      const order = await orderService.getForUser(req.params.id!, req.user.id);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
}

export const orderController = new OrderController();