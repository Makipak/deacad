// Extend base config, tambah rules khusus Next.js 16 (flat config, sejalan dengan ESLint v10).
// eslint-config-next 16.x sudah publish flat config asli lewat subpath "./core-web-vitals" —
// TIDAK perlu (dan TIDAK BISA) lagi dibungkus FlatCompat: plugin di dalamnya didaftarkan sebagai
// object (`plugins: { react, "react-hooks" }`), bukan array nama string ala .eslintrc lama, jadi
// FlatCompat.extends() gagal validasi schema legacy-nya dan crash "Converting circular structure
// to JSON" (mencoba serialize object plugin yang circular-referencing dirinya sendiri).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import base from "./base.js";

export default [
  ...base,
  // "next/core-web-vitals" mencakup aturan React hooks + Next.js image/link best practice.
  ...nextCoreWebVitals,
];
