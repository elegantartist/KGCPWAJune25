# Use Node.js 20 as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Set build arguments
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Build application
RUN npm run build

# Open port for Express server
EXPOSE 5000

# Start the application
CMD ["npm", "run", "start"]