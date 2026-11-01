/**
 * Public interface of the Products module.
 * Orders module uses productService.checkAndReserveStock – never queries products tables.
 */
export { productService } from './services/product.service.js';
export { createProductsRouter } from './routes.js';