FROM node:22-alpine

WORKDIR /app

# pnpm 설치
RUN corepack enable pnpm

# ffmpeg 설치 (Alpine)
RUN apk add --no-cache ffmpeg

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod=false

COPY . .

# 개발 환경: 핫리로드
CMD ["pnpm", "run", "start:dev"]