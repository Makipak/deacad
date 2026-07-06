import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  documentSearchQuerySchema,
  uploadDocumentInputSchema,
} from "@deacad/shared-types";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import type { AuthenticatedUser } from "../common/types/authenticated-user.js";
import { DownloadAccessGuard } from "./guards/download-access.guard.js";
import { DocumentsService } from "./documents.service.js";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Public()
  @Get()
  search(@Query() rawQuery: Record<string, string>) {
    // Query string selalu string — coerce field angka dulu sebelum divalidasi Zod (limit tidak auto-parse dari "20").
    const normalized = { ...rawQuery, limit: rawQuery.limit ? Number(rawQuery.limit) : undefined };
    const parsed = new ZodValidationPipe(documentSearchQuerySchema).transform(normalized);
    return this.documentsService.search(parsed);
  }

  @Public()
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.documentsService.findOne(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor("file")) // simpan buffer di memori dulu, divalidasi magic bytes sebelum upload ke storage.
  upload(
    @Body() rawBody: Record<string, string>,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // multipart/form-data mengirim semua field sebagai string — normalisasi boolean sebelum validasi Zod.
    const normalized = {
      ...rawBody,
      ownershipConfirmed: rawBody.ownershipConfirmed === "true",
    };
    const parsed = new ZodValidationPipe(uploadDocumentInputSchema).transform(normalized);
    return this.documentsService.upload(user.id, parsed, file);
  }

  @Get(":id/download")
  @UseGuards(DownloadAccessGuard) // cek toggle payment + kepemilikan akses (ARCHITECTURE.md #5).
  download(@Param("id") id: string) {
    return this.documentsService.recordDownload(id);
  }

  // Path terpisah dari GET "/" (search publik) supaya tidak bentrok routing di controller yang sama.
  @Get("admin/all")
  @Roles("admin")
  @UseGuards(RolesGuard)
  listForAdmin(@Query("status") status?: string) {
    return this.documentsService.listForAdmin(status);
  }

  @Post(":id/unpublish")
  @Roles("admin")
  @UseGuards(RolesGuard)
  unpublish(@Param("id") id: string) {
    return this.documentsService.unpublish(id);
  }
}
