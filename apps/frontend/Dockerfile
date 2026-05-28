FROM node:20-alpine

WORKDIR /app

# Pass environment variables for the Vite build
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Install pnpm and the static file server globally
RUN npm install -g pnpm serve

# Copy package files (Looking for pnpm-lock.yaml this time)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies strictly using pnpm
RUN pnpm install

# Copy the rest of the codebase
COPY . .

# Build the optimized production bundle
RUN pnpm run build

EXPOSE 5173

# Serve the static built files
CMD ["serve", "-s", "dist", "-l", "5173"]