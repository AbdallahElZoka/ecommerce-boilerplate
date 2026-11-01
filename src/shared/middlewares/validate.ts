import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

type RequestSource = 'body' | 'query' | 'params';

export function validate<T>(schema: ZodSchema<T>, source: RequestSource = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Replace with parsed (coerced/cleaned) data
    (req as Request & { [K in RequestSource]?: unknown })[source] = result.data;
    next();
  };
}