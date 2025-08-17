FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies first
RUN npm install

# Copy source code
COPY . .

# Build the application using the docker-build script
RUN npm run docker-build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application using PORT environment variable
CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]
