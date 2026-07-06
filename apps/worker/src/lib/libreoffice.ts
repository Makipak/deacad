import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

// Convert PPTX -> PDF pakai LibreOffice headless (open-source, gratis, akurat untuk file office —
// alasan pemilihan ada di ARCHITECTURE.md #2).
export async function convertPptxToPdf(inputPath: string, outputDir: string): Promise<string> {
  await execFileAsync(
    "soffice",
    [
      "--headless",
      "--norestore", // jangan buka dialog "recovery" dari crash sebelumnya — bikin proses hang di container.
      "--convert-to",
      "pdf",
      "--outdir",
      outputDir,
      inputPath,
    ],
    { timeout: 120_000 }, // 2 menit — cegah satu file corrupt bikin job gantung selamanya.
  );

  const inputFileName = inputPath.split("/").pop()!.replace(/\.pptx$/i, ".pdf");
  return join(outputDir, inputFileName);
}
