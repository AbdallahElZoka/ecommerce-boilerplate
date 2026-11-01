import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0).default(0),
  categoryId: z.string().cuid(),
});

export const listProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type ListProductsInput = z.infer<typeof listProductsSchema>;