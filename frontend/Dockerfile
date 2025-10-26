FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy the rest of your source code
COPY . .

# Build the app
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start the app in production mode
CMD ["npm", "start"]