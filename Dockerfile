FROM node:22-alpine

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

# 개발 환경: 핫리로드
CMD ["pnpm", "run", "start:dev"]