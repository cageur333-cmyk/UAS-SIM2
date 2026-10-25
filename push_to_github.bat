@echo off
title Push UAS-SIM2 to GitHub
cd /d "%~dp0"

echo ====================================================
echo   PUSHING PROJECT UAS KE GITHUB (UAS-SIM2)
echo ====================================================
echo.

echo 1. Menyiapkan file-file perubahan (git add)...
git add .

echo 2. Menyimpan commit...
git commit -m "Update BuildPro ERP dengan dukungan GitHub Pages & Vercel" >nul 2>&1

echo 3. Mengupload ke GitHub (git push)...
git push -u origin main

echo.
echo ====================================================
if %errorlevel% equ 0 (
    echo   [SUKSES] BERHASIL DIPUSH KE GITHUB!
    echo   Repository: https://github.com/cageur333-cmyk/UAS-SIM2
) else (
    echo   [GAGAL] CEK PESAN ERROR DI ATAS
)
echo ====================================================
echo.
pause
