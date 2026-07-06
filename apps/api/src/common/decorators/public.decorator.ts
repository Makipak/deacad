import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

// Tandai endpoint yang boleh diakses tanpa login. Default semua endpoint TERPROTEKSI
// (fail-secure, lihat JwtAuthGuard) — endpoint baru otomatis aman kecuali eksplisit @Public().
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
