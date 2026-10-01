import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";
import { basename, join } from "node:path";
import { PermanentJobError } from "../errors.js";

const execFileAsync = promisify(execFile);

// Convert PPTX -> PDF pakai LibreOffice headless (open-source, gratis, akurat untuk file office —
// alasan pemilihan ada di ARCHITECTURE.md #2). HANYA terpakai kalau upload PPTX dinyalakan
// (ALLOW_PPTX_UPLOAD=true di api) — itu butuh LibreOffice terpasang di mesin worker (VPS/Docker).
// Di shared hosting `soffice` tidak ada; job PPTX di sana gagal permanen dengan pesan yang jelas.
export async function convertPptxToPdf(inputPath: string, outputDir: string): Promise<string> {
  try {
    await execFileAsync(
      "soffice",
      [
        "--headless",
        "--norestore", // jangan buka dialog "recovery" dari crash sebelumnya — bikin proses hang di container.
        // Profil LibreOffice di folder kerja job (bukan $HOME) — tahan terhadap HOME read-only & dua proses paralel.
        `-env:UserInstallation=file://${join(outputDir, "lo-profile")}`,
        "--convert-to",
        "pdf",
        "--outdir",
        outputDir,
        inputPath,
      ],
      { timeout: 120_000 }, // 2 menit — cegah satu file corrupt bikin job gantung selamanya.
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new PermanentJobError(
        "LibreOffice (soffice) tidak terpasang di server ini, jadi PPTX tidak bisa diproses. Unggah dalam format PDF.",
      );
    }
    throw error; // timeout/crash LibreOffice -> biarkan retry.
  }

  const outputPath = join(outputDir, basename(inputPath).replace(/\.pptx$/i, ".pdf"));
  try {
    await access(outputPath);
  } catch {
    throw new Error("LibreOffice selesai tetapi tidak menghasilkan file PDF");
  }
  return outputPath;
}
