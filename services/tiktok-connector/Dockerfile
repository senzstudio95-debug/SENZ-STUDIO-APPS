FROM node:24-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
EXPOSE 3000
CMD ["node","server.mjs"]
