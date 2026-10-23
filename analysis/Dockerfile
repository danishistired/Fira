FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libxml2-dev libxslt-dev zlib1g-dev libjpeg-dev git \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application source into the image.
# The DB and artifacts are intentionally NOT copied — they live on
# the named Docker volume mounted at /data at runtime.
COPY . .

# Create the data directory that the named volume will be mounted over.
# This ensures the path exists even before the volume is attached.
RUN mkdir -p /data/artifacts

EXPOSE 5050
CMD ["python", "app.py"]
