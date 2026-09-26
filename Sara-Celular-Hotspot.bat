@echo off
rem Igual ao Sara-Celular.bat, mas o PC cria a propria rede Wi-Fi para o celular.
call "%~dp0Sara-Celular.bat" --hotspot %*
