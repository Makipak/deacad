import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@deacad/shared-types";

export const ROLES_KEY = "roles";

// Tandai endpoint yang cuma boleh diakses role tertentu, dicek RolesGuard di backend
// — bukan cuma disembunyikan di UI (ARCHITECTURE.md #7, Broken Access Control).
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
