FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

RUN openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/ssl/private/server.key \
    -out /etc/ssl/certs/server.crt \
    -subj "/C=CN/O=WSS/CN=webrtc-screen-share" && \
    addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app /etc/ssl/private /etc/ssl/certs

USER appuser

EXPOSE 443
CMD ["node", "server.js"]
