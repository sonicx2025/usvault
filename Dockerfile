FROM python:3.11-slim

ARG USE_CN_MIRROR=0

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    DATA_DIR=/data TMPDIR=/data/tmp

# ffmpeg 用于生成视频缩略图、读取时长与自动转码非 H.264 视频
RUN if [ "$USE_CN_MIRROR" = "1" ] && [ -f /etc/apt/sources.list.d/debian.sources ]; then \
      sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources; \
    fi \
    && apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY requirements.txt .
RUN if [ "$USE_CN_MIRROR" = "1" ]; then \
      pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi

# APP_VERSION 放在依赖安装之后，避免每次版本号变化导致 170MB 的 ffmpeg 层缓存失效
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}
COPY app ./app

EXPOSE 8080
CMD ["sh", "-c", "mkdir -p /data/tmp && exec uvicorn app.main:app --host 0.0.0.0 --port 8080 --proxy-headers --forwarded-allow-ips='*'"]
