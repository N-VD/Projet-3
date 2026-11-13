FROM python:3.12-slim
WORKDIR /app

COPY requirements-service.txt .
RUN pip install --no-cache-dir -r requirements-service.txt

COPY detection.py service.py ./
COPY templates_rangs_2 ./templates_rangs_2

# -u : les print apparaissent tout de suite dans `docker compose logs`
CMD ["python", "-u", "service.py"]
