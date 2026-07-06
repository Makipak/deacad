// Base eslint flat config (format wajib sejak ESLint v9+) dipakai semua package.
// Flat config = array of config object, bukan lagi .eslintrc bergaya "extends" lama.
import js from "@eslint/js"; // aturan dasar JS bawaan ESLint.
import tseslint from "typescript-eslint"; // aturan TypeScript-aware.

export default tseslint.config(
  // Folder yang tidak perlu di-lint sama sekali.
  {
    ignores: ["dist/**", ".next/**", "node_modules/**", "generated/**"],
  },
  // Rules JS dasar (no-unused-vars, no-undef, dst).
  js.configs.recommended,
  // Rules TypeScript standar (type-aware tapi tanpa perlu tsconfig project service berat).
  ...tseslint.configs.recommended,
  {
    rules: {
      // Variabel unused prefix "_" diperbolehkan (pola umum untuk param yang sengaja diabaikan).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // any eksplisit tetap warning bukan error — kadang perlu untuk interop lib pihak ketiga.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
