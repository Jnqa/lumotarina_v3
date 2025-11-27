FROM node:18-alpine
WORKDIR /srv/app
COPY package*.json ./
RUN npm ci --production --silent
COPY . .
ENV NODE_ENV=production
# expose port used by express backend (default 3001)
EXPOSE 3001
COPY ./docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "start"]
# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
