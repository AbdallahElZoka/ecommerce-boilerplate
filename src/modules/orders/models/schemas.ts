import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        quantity: z.coerce.number().int().min(1).max(100),
      })
    )
    .min(1),
  shippingAddress: z
    .object({
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().optional(),
      postalCode: z.string().min(1),
      country: z.string().min(2).max(2),
    })
    .optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;