import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { createCategoryInputSchema, type CreateCategoryInput } from "@deacad/shared-types";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { CategoriesService } from "./categories.service.js";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public() // dipakai filter dropdown di halaman browse publik.
  @Get()
  list() {
    return this.categoriesService.list();
  }

  @Post()
  @Roles("admin")
  @UseGuards(RolesGuard)
  create(@Body(new ZodValidationPipe(createCategoryInputSchema)) body: CreateCategoryInput) {
    return this.categoriesService.create(body);
  }

  @Delete(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  remove(@Param("id") id: string) {
    return this.categoriesService.remove(id);
  }
}
