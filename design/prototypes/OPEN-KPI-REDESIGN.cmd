@echo off
setlocal
title Buka KPI Kinerja Modern di FigCraft
set "SRC=D:\Produktif\BantuanIT File\Project\Localdesk-Bridge\scripts\figcraft-bridge\generated\abprove-02-dashboard-modern-20261112.figcraft"
set "DST=%~dp0KPI-Kinerja-UIUX-Modern-20261112.figcraft"
set "APP=C:\Program Files\ArtCraft\FigCraft\figcraft.exe"
echo.
echo     ABPROVE KPI — Modern Redesign
echo     -----------------------------
echo.
if not exist "%SRC%" (
  echo [ERROR] Redesign FigCraft tidak ditemukan di:
  echo %SRC%
  pause
  exit /b 1
)
if not exist "%APP%" (
  echo [ERROR] Aplikasi FigCraft tidak ditemukan di:
  echo %APP%
  pause
  exit /b 1
)
if not exist "%DST%" (
  echo Menyalin desain baru ke folder project KPI...
  copy /B "%SRC%" "%DST%" >nul
  if errorlevel 1 (
    echo [ERROR] Gagal menyalin file FigCraft.
    pause
    exit /b 1
  )
) else (
  echo File redesign sudah ada; tidak menimpa hasil edit yang mungkin kamu simpan sebelumnya.
)
echo [OK] File redesign:
echo %DST%
echo.
echo Membuka file di aplikasi FigCraft...
start "" "%APP%" "%DST%"
exit /b 0
