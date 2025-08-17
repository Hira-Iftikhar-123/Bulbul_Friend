FROM node:18-alpine 

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application using PORT environment variable
CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]
