import { orderRepository } from '../repositories/order.repository.js';
import { productService } from '../../products/index.js';
import { AppError } from '../../../shared/errors/AppError.js';
import type { CreateOrderInput } from '../models/schemas.js';

export class OrderService {
  async create(userId: string, input: CreateOrderInput) {
    // Cross-module communication via public service interface only
    const reservedItems: {
      productId: string;
      quantity: number;
      unitPrice: number;
    }[] = [];

    let total = 0;

    for (const item of input.items) {
      const reserved = await productService.checkAndReserveStock(
        item.productId,
        item.quantity
      );
      reservedItems.push({
        productId: reserved.productId,
        quantity: item.quantity,
        unitPrice: reserved.unitPrice,
      });
      total += reserved.unitPrice * item.quantity;
    }

    const order = await orderRepository.create({
      userId,
      totalAmount: total,
      shippingAddress: input.shippingAddress,
      items: reservedItems,
    });

    return order;
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const { items, total } = await orderRepository.findByUser(userId, page, limit);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getForUser(orderId: string, userId: string) {
    const order = await orderRepository.findByIdForUser(orderId, userId);
    if (!order) throw AppError.notFound('Order not found');
    return order;
  }
}

export const orderService = new OrderService();