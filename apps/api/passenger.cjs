// Startup file untuk Phusion Passenger (cPanel "Setup Node.js App").
// Passenger meng-require file ini sebagai CommonJS, sedangkan build API berupa ESM (dist/main.js),
// jadi kita load lewat dynamic import(). Passenger meng-hook app.listen() otomatis.
const path = require("node:path");

import(path.join(__dirname, "dist", "main.js")).catch((err) => {
  console.error("Gagal start API:", err);
  process.exit(1);
});
