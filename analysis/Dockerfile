FROM python:3.12-slim

ARG JADX_VERSION=1.4.7
ARG APKTOOL_VERSION=2.9.3

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ARGUS_DB_PATH=/data/argus.db \
    ARGUS_ARTIFACTS_DIR=/data/artifacts \
    ARGUS_TEMP_DIR=/tmp/argus-temp \
    TEMP=/tmp

RUN apt-get update && apt-get install -y --no-install-recommends \
    adb \
    ca-certificates \
    curl \
    build-essential \
    libxml2-dev \
    libxslt1-dev \
    zlib1g-dev \
    libjpeg62-turbo-dev \
    openjdk-17-jre-headless \
    unzip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY analysis/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /tools/jadx /tools/apktool \
  && curl --fail --location --retry 3 \
       "https://github.com/skylot/jadx/releases/download/v${JADX_VERSION}/jadx-${JADX_VERSION}.zip" \
       -o /tmp/jadx.zip \
  && unzip -q /tmp/jadx.zip -d /tools/jadx \
  && chmod +x /tools/jadx/bin/jadx \
  && curl --fail --location --retry 3 \
       "https://github.com/iBotPeaches/Apktool/releases/download/v${APKTOOL_VERSION}/apktool_${APKTOOL_VERSION}.jar" \
       -o /tools/apktool/apktool.jar \
  && rm /tmp/jadx.zip

COPY analysis/ /app/
RUN useradd --system --uid 10001 --create-home argus \
  && mkdir -p /data/artifacts /tmp/argus-temp \
  && chown -R argus:argus /app /data /tmp/argus-temp

USER argus

EXPOSE 5050
CMD ["python", "app.py"]
