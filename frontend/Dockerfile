FROM node:18 

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies first
RUN npm install

# Copy source code
COPY . .

# Set proper permissions for node_modules binaries
RUN chmod +x node_modules/.bin/*

# Build the application using npx with yes flag
RUN npx --yes webpack --mode production

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application using PORT environment variable
CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]
