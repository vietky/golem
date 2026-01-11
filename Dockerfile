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
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -buildvcs=false -o server ./cmd/server

# Runtime stage
FROM alpine:latest

# Install ca-certificates for HTTPS and wget for healthcheck
RUN apk --no-cache add ca-certificates wget

WORKDIR /root/

# Copy the binary from Go builder
COPY --from=go-builder /app/server .

# Copy web static files
COPY --from=go-builder /app/web/static ./web/static

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Run the server
CMD ["./server", "-port", "8080"]

