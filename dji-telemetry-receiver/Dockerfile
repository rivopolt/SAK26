# Runs the FastAPI/MQTT receiver. The MQTT broker (EMQX) is deployed as a
# SEPARATE Fly.io app (see README.md) rather than bundled in this same
# container — Fly.io's networking model works far more cleanly with one
# process per app/container than trying to supervise two long-running
# services (uvicorn + EMQX) inside one box.
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

EXPOSE 8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
