import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import {
  loginInputSchema,
  registerInputSchema,
  type LoginInput,
  type RegisterInput,
} from "@deacad/shared-types";
import { Public } from "../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { AuthService, type TokenPair } from "./auth.service.js";

const REFRESH_COOKIE_NAME = "refresh_token";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // rate limit ketat — endpoint sensitif (ARCHITECTURE.md #7).
  @Post("register")
  register(@Body(new ZodValidationPipe(registerInputSchema)) body: RegisterInput) {
    return this.authService.register(body);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginInputSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawRefreshToken) {
      throw new UnauthorizedException("Refresh token tidak ditemukan");
    }
    const result: TokenPair = await this.authService.refresh(rawRefreshToken);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawRefreshToken) {
      await this.authService.logout(rawRefreshToken);
    }
    res.clearCookie(REFRESH_COOKIE_NAME);
    return { message: "Logout berhasil" };
  }

  @Public()
  @Get("verify-email")
  verifyEmail(@Query("token") token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 300_000 } }) // ketat — endpoint ini rawan disalahgunakan spam email.
  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body("email") email: string) {
    return this.authService.resendVerification(email);
  }

  private setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true, // tidak bisa diakses JS — mitigasi XSS (ARCHITECTURE.md #8).
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: expiresAt,
      path: "/api/v1/auth", // scope cookie cuma ke endpoint auth, bukan seluruh domain.
    });
  }
}
