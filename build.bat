@echo off
powershell -Command "Start-Process cmd -Verb RunAs -ArgumentList '/c cd /d %cd% && npm run build && pause'" 