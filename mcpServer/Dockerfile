# Use Debian trixie-slim (glibc 2.40) to satisfy Apollo MCP Server's glibc >= 2.38 requirement
FROM debian:trixie-slim

WORKDIR /app

# Install dependencies: curl for downloading binary, ca-certificates for HTTPS
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Apollo MCP Server and move to /usr/local/bin
RUN curl -sSL https://mcp.apollo.dev/download/nix/latest | sh \
    && mv ./apollo-mcp-server /usr/local/bin/apollo-mcp-server \
    && chmod +x /usr/local/bin/apollo-mcp-server

# Copy the MCP configuration file
COPY mcp_config.yaml /app/mcp_config.yaml

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port 8000
EXPOSE 8000

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
