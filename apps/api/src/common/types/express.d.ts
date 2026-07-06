import type { AuthenticatedUser } from "./authenticated-user.js";

// Augment Express Request supaya `request.user` (ditempel JwtAuthGuard) punya tipe yang benar
// di seluruh codebase, bukan implicit any.
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
