/**
 * Public interface of the Users module.
 * Other modules may ONLY import from this file.
 * Never import repositories, services, or models of users from outside.
 */

export { authenticate } from './middlewares/authenticate.js';
export { authorize, requireOwnership } from './middlewares/authorize.js';
export type { AuthUser, UserProfile, JwtPayload } from './models/types.js';

// Router factory so app.ts can mount it
export { createUsersRouter } from './routes.js';