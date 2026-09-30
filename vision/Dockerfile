FROM python:3.12-slim

WORKDIR /app

# Version sans interface graphique d'OpenCV : suffisante pour le mode démo et le flux vidéo
RUN pip install --no-cache-dir opencv-python-headless numpy

COPY . .

EXPOSE 8000

CMD ["python", "-u", "serveur.py", "--source", "demo"]
