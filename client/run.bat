@echo off
set npm_config_arch=x64
start /B npm run dev:renderer
start /B npm run start:electron
