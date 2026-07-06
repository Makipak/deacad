import type { UserRole } from "@deacad/shared-types";

// Payload minimal yang disimpan di dalam JWT access token dan ditempel ke request.user.
export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}
