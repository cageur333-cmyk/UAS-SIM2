@echo off
title BuildPro ERP - Server & Public Sharing
cd /d "%~dp0"

echo ===================================================================
echo     BUILDPRO ERP - TOKO MATERIAL & GROSIR BAHAN BANGUNAN
echo ===================================================================
echo.

:: 1. Cek & Jalankan Server Node.js
netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Server Node.js sudah aktif di port 3000.
) else (
    echo [INFO] Menyalakan Server Node.js di http://localhost:3000 ...
    start "BuildPro ERP Server" cmd /k "node server.js"
    timeout /t 3 >nul
)

:: 2. Dapatkan IP Lokal Wi-Fi
echo.
echo [1] AKSES LOKAL (Satu Wi-Fi / Hotspot):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"Alamat IPv4"') do (
    set "local_ip=%%a"
    goto :found_ip
)
:found_ip
set "local_ip=%local_ip: =%"
if defined local_ip (
    echo     👉 http://%local_ip%:3000
) else (
    echo     👉 http://localhost:3000
)

echo.
echo [2] AKSES ONLINE PUBLIK (Cloudflare Tunnel):
echo     Tunggu sebentar, link publik HTTPS sedang dibuat...
echo.

:: 3. Jalankan Cloudflare Tunnel
if exist "cloudflared.exe" (
    .\cloudflared.exe tunnel --url http://localhost:3000
) else (
    echo [WARNING] cloudflared.exe tidak ditemukan di folder ini!
    echo Mencoba menggunakan npx cloudflared...
    npx -y untun tunnel 3000
)

echo.
echo ===================================================================
pause
