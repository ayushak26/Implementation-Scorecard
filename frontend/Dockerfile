FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and ensure next is in PATH
RUN npm ci || npm install
ENV PATH=/app/node_modules/.bin:$PATH

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Run in development mode (use "npm run start" for production)
CMD ["npm", "run", "dev"]