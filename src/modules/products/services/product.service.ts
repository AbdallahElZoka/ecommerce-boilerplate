import { productRepository } from '../repositories/product.repository.js';
import { AppError } from '../../../shared/errors/AppError.js';
import type { CreateProductInput, ListProductsInput } from '../models/schemas.js';

export class ProductService {
  async list(params: ListProductsInput) {
    const { items, total } = await productRepository.list(params);
    return {
      items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  async getById(id: string) {
    const product = await productRepository.findById(id);
    if (!product || !product.isActive) throw AppError.notFound('Product not found');
    return product;
  }

  async getBySlug(slug: string) {
    const product = await productRepository.findBySlug(slug);
    if (!product || !product.isActive) throw AppError.notFound('Product not found');
    return product;
  }

  async create(input: CreateProductInput) {
    const existing = await productRepository.findBySlug(input.slug);
    if (existing) throw AppError.conflict('Product slug already exists');
    return productRepository.create(input);
  }

  /** Called by Orders module via public interface – never direct DB */
  async checkAndReserveStock(productId: string, quantity: number): Promise<{
    productId: string;
    unitPrice: number;
    name: string;
  }> {
    const product = await productRepository.findById(productId);
    if (!product || !product.isActive) {
      throw AppError.notFound(`Product ${productId} not found`);
    }
    if (product.stock < quantity) {
      throw AppError.badRequest(`Insufficient stock for product ${product.name}`);
    }
    const reserved = await productRepository.decrementStock(productId, quantity);
    if (!reserved) {
      throw AppError.badRequest(`Could not reserve stock for ${product.name}`);
    }
    return {
      productId: product.id,
      unitPrice: Number(product.price),
      name: product.name,
    };
  }
}

export const productService = new ProductService();