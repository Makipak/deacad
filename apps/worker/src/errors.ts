// Error yang TIDAK ada gunanya di-retry (file rusak, format tidak didukung, LibreOffice tidak terpasang, dst):
// job langsung ditandai gagal tanpa menghabiskan sisa percobaan.
export class PermanentJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentJobError";
  }
}
