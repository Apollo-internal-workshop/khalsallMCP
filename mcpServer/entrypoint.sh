#!/bin/sh
set -e

echo "Starting Apollo MCP Server..."
exec apollo-mcp-server /app/mcp_config.yaml
