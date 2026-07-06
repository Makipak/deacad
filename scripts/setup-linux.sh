#!/usr/bin/env bash
# Setup dependency development Deacad di Pop!_OS / Ubuntu (Debian-based).
# Idempotent — aman dijalankan ulang, tiap step cek dulu sebelum install.
#
# Pemakaian:
#   chmod +x scripts/setup-linux.sh
#   ./scripts/setup-linux.sh
#
# Yang di-install:
#   - nvm + Node.js 22 (sesuai "engines" di package.json root)
#   - pnpm (lewat corepack, bawaan Node — bukan install global terpisah yang gampang beda versi)
#   - Docker Engine + plugin compose (dari repo resmi Docker, BUKAN paket docker.io Ubuntu yang lebih lama)
#   - LibreOffice + poppler-utils (dipakai apps/worker kalau mau dites jalan LANGSUNG di host, di luar Docker)
#   - postgresql-client + redis-tools (buat psql/redis-cli debug cepat ke container docker-compose)

set -euo pipefail

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }

if [ ! -f /etc/os-release ] || ! grep -qiE 'ubuntu|pop' /etc/os-release; then
  echo "Script ini ditujukan untuk Pop!_OS/Ubuntu (Debian-based, pakai apt). OS lain, ikuti README manual." >&2
  exit 1
fi

log "Update package index"
sudo apt-get update -y

# --- Node.js via nvm ---
# nvm dipilih daripada apt/NodeSource langsung supaya versi Node gampang di-switch per project
# tanpa bentrok sudo/system Node — umum dipakai kalau laptop dipakai banyak project Node berbeda versi.
if [ ! -d "$HOME/.nvm" ]; then
  log "Install nvm"
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

log "Install Node.js 22 (sesuai package.json: engines.node >=22.0.0)"
nvm install 22
nvm alias default 22

log "Aktifkan corepack + siapkan pnpm 11.9.0 (sesuai packageManager di package.json)"
corepack enable
corepack prepare pnpm@11.9.0 --activate

# --- Docker Engine + Compose plugin (repo resmi, bukan docker.io) ---
if ! command -v docker >/dev/null 2>&1; then
  log "Install Docker Engine + Compose plugin"
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  UBUNTU_CODENAME="$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")"
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # Supaya `docker` tidak perlu sudo tiap perintah — perlu logout/login (atau `newgrp docker`) sekali biar aktif.
  sudo usermod -aG docker "$USER"
  log "Docker terpasang. Logout/login ulang (atau jalankan 'newgrp docker') supaya bisa pakai docker tanpa sudo."
else
  log "Docker sudah terpasang, skip"
fi

# --- LibreOffice + Poppler (dipakai apps/worker kalau dites tanpa Docker) ---
log "Install LibreOffice + poppler-utils"
sudo apt-get install -y libreoffice poppler-utils

# --- CLI client buat debug Postgres/Redis dari docker-compose ---
log "Install postgresql-client + redis-tools"
sudo apt-get install -y postgresql-client redis-tools

log "Setup selesai. Langkah berikut:"
cat <<'EOF'

  1. Buka terminal BARU (atau jalankan: source ~/.bashrc) supaya nvm & docker group aktif.
  2. cp .env.example .env    # isi DATABASE_URL, JWT secret, dst.
  3. pnpm install
  4. docker compose up -d postgres redis storage
  5. pnpm db:migrate && pnpm db:seed
  6. pnpm dev                # atau `pnpm dev:web` kalau cuma mau demo frontend dulu

Detail lengkap ada di README.md.
EOF
