# setup.ps1
# วิธีใช้: เปิด PowerShell ใน VS Code แล้วรัน: .\setup.ps1

Write-Host "=== Crypto Quant Screener Setup ===" -ForegroundColor Cyan

# ตรวจสอบว่า npm ติดตั้งแล้ว
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: ไม่พบ Node.js กรุณาติดตั้งจาก https://nodejs.org" -ForegroundColor Red
    exit 1
}

Write-Host "Node.js version: $(node --version)" -ForegroundColor Green
Write-Host "npm version: $(npm --version)" -ForegroundColor Green

# ติดตั้ง dependencies
Write-Host "`nกำลังติดตั้ง dependencies..." -ForegroundColor Yellow
npm install

# สร้าง .env.local ถ้ายังไม่มี
if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.local.example" ".env.local"
    Write-Host "`nสร้าง .env.local แล้ว — กรุณาแก้ไขค่า Supabase และ Bitkub ก่อนรัน" -ForegroundColor Yellow
    Write-Host "เปิดไฟล์: notepad .env.local" -ForegroundColor Cyan
} else {
    Write-Host ".env.local มีอยู่แล้ว" -ForegroundColor Green
}

Write-Host "`n=== Setup เสร็จสิ้น ===" -ForegroundColor Green
Write-Host "รัน: npm run dev" -ForegroundColor Cyan
