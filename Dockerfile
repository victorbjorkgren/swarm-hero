FROM node:22 AS builder
WORKDIR /app
COPY client-delivery-service ./client-delivery-service
COPY frontend ./frontend
COPY common ./common
COPY shared ./shared

# Build the frontend
RUN echo "Building frontend..." \
    && cd frontend \
    && yarn install \
    && yarn build \
    && cd ..

# Build the server
RUN echo "Building server..." \
    && cd common \
    && yarn install \
    && cd ../client-delivery-service \
    && yarn install \
    && yarn server:build \
    && echo "Transferring build artifacts..." \
    && yarn transfer

# Setup Runtime
FROM node:22 AS runtime

WORKDIR /app
COPY --from=builder /app/client-delivery-service/dist ./dist
COPY --from=builder /app/client-delivery-service/public ./public
COPY common/package.json .
RUN yarn install --production
COPY client-delivery-service/package.json .
RUN yarn install --production
EXPOSE 8080

# Start the application
CMD ["node", "dist/client-delivery-service/main.js"]
