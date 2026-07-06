// Extend base config, tambah rules khusus Next.js 16 (flat config, sejalan dengan ESLint v10).
import { FlatCompat } from "@eslint/eslintrc"; // jembatan karena eslint-config-next masih publish format lama.
import base from "./base.js";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...base,
  // "next/core-web-vitals" mencakup aturan React hooks + Next.js image/link best practice.
  ...compat.extends("next/core-web-vitals"),
];
