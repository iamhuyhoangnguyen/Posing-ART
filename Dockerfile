FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json .npmrc bun.lock ./
RUN npm install

COPY . .
RUN npm run build && mkdir -p /data && chown node:node /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000
VOLUME ["/data"]
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start"]
