# Build from the repository root:  docker build -f backend/Dockerfile -t offerquest-backend .
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend backend
# SQLite, checkpoints, ChromaDB notes and exported resumes live here: mount a volume to keep them.
ENV OFFERQUEST_DATA=/data
VOLUME /data
EXPOSE 8000
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
