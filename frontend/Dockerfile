FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install webpack-cli globally first
RUN npm install -g webpack-cli

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application using the docker-build script
RUN npm run docker-build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built application from builder stage
COPY --from=builder /app/build ./build

# Expose port
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "build", "-l", "3000"]
