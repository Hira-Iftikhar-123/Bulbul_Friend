FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install webpack-cli globally to avoid permission issues
RUN npm install -g webpack-cli

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application using webpack directly
RUN webpack --mode production

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application using PORT environment variable
CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]
