import { prisma } from '../../../shared/database/prisma.js';
import type { Order, OrderStatus, Prisma } from '@prisma/client';

export class OrderRepository {
  async create(data: {
    userId: string;
    totalAmount: number;
    shippingAddress?: Prisma.InputJsonValue;
    items: { productId: string; quantity: number; unitPrice: number }[];
  }): Promise<Order> {
    return prisma.order.create({
      data: {
        userId: data.userId,
        totalAmount: data.totalAmount,
        shippingAddress: data.shippingAddress,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const where = { userId };
    const [items, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  async findByIdForUser(orderId: string, userId: string) {
    return prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    return prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }
}

export const orderRepository = new OrderRepository();