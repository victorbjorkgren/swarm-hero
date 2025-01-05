#!/bin/bash

# Navigate to the frontend folder and build the React app
echo "Building frontend..."
cd ../frontend || exit 1
yarn install
yarn build


# Return to the client delivery service folder

# Build the server
echo "Building server..."
cd ../common || exit 1
yarn install

cd ../client-delivery-service || exit 1
yarn install
yarn server:build

# Optional: Transfer or additional steps
echo "Transferring build artifacts..."
yarn transfer