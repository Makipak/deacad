import { z } from "zod";

export const categorySchema = z.object({
  id: z.cuid(),
  name: z.string().min(2).max(100),
});
export type Category = z.infer<typeof categorySchema>;

export const createCategoryInputSchema = z.object({
  name: z.string().min(2).max(100),
});
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;
