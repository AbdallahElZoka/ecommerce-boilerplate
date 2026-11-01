import { prisma } from '../../../shared/database/prisma.js';
import type { Product, Prisma } from '@prisma/client';

export class ProductRepository {
  async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { slug } });
  }

  async list(params: {
    page: number;
    limit: number;
    categoryId?: string;
    search?: string;
  }): Promise<{ items: Product[]; total: number }> {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    price: number;
    stock: number;
    categoryId: string;
  }): Promise<Product> {
    return prisma.product.create({ data });
  }

  async decrementStock(productId: string, quantity: number): Promise<boolean> {
    // Atomic stock check + decrement to avoid overselling
    const result = await prisma.product.updateMany({
      where: { id: productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    return result.count === 1;
  }
}

export const productRepository = new ProductRepository();