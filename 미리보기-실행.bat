@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo KIGLE 페이지 미리보기를 시작합니다.
echo 브라우저에서 http://localhost:5173 이 열립니다.
echo 끝내려면 이 창을 닫으세요.
rem 서버가 준비될 시간을 2초 준 뒤 브라우저를 엶
start "" /b cmd /c "timeout /t 2 >nul & start http://localhost:5173"
python -m http.server 5173
