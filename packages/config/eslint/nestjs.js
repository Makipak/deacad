// Extend base config, tambah rules yang relevan untuk backend NestJS (decorator-heavy).
import base from "./base.js";

export default [
  ...base,
  {
    rules: {
      // NestJS pakai banyak class kosong/DTO tanpa constructor body — wajar, jangan di-flag.
      "@typescript-eslint/no-extraneous-class": "off",
      // Decorator param (mis. @Body() dto: CreateDto) sering "unused" secara statis tapi dipakai runtime DI.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
