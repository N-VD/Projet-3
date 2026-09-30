@echo off
rem Lance la vision du blackjack live sur la webcam, avec l'environnement Python du dossier.
rem Options possibles en plus : camera.bat --camera 1 --fenetre
cd /d "%~dp0"

if not exist .venv\Scripts\python.exe (
    echo Premiere utilisation : installation des dependances...
    python -m venv .venv || exit /b 1
    .venv\Scripts\python -m pip install -r requirements.txt || exit /b 1
)

.venv\Scripts\python serveur.py --source camera %*
