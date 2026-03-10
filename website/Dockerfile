FROM node:18-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
ENV NODE_ENV=production
RUN npm run build

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000
CMD ["/app/start.sh"]
