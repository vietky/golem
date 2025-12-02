# Build stage - Go server
FROM golang:1.24-alpine AS go-builder

# Set working directory
WORKDIR /app

# Install git and build tools
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the server binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -ldflags="-w -s" -o server ./cmd/server

# Build stage - React frontend (optional)
FROM node:18-alpine AS react-builder

WORKDIR /app

# Copy React frontend files
COPY web/react-frontend/package*.json ./
# Install dependencies (will fail gracefully if files don't exist)
RUN npm ci || (echo "No React frontend found, creating empty dist..." && mkdir -p dist)

# Copy React frontend source first
COPY web/react-frontend/ ./

# Copy static images to public/images (Vite expects public directory for assets)
# Images are referenced in CSS and need to be available during build
COPY web/static/images ./public/images/

# Build React app
RUN if [ -f package.json ]; then \
      echo "Building React app..." && \
      npm run build || (echo "React build failed, but continuing..." && mkdir -p dist); \
      echo "React build process completed"; \
    else \
      echo "No package.json found, creating empty dist..." && \
      mkdir -p dist; \
    fi

# Runtime stage
FROM alpine:latest

# Install ca-certificates for HTTPS and wget for healthcheck
RUN apk --no-cache add ca-certificates wget

WORKDIR /root/

# Copy the binary from Go builder
COPY --from=go-builder /app/server .

# Copy static web files (vanilla JS version - fallback)
COPY --from=go-builder /app/web/static ./web/static

# Copy React build output (if build succeeded)
# Note: COPY doesn't support conditional logic, so we copy if it exists
# Create web/react directory first, then copy dist contents
RUN mkdir -p ./web/react
COPY --from=react-builder /app/dist ./web/react/

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Run the server
CMD ["./server", "-port", "8080"]

