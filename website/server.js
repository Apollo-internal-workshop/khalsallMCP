import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an AI assistant helping workshop attendees explore the KBT Threads GraphQL supergraph. KBT Threads is an outdoor sports and adventure clothing brand.

You have access to GraphQL tools via an Apollo MCP server connected to the supergraph. Use them to:
- Explore the schema to understand what data is available
- Query products, inventory, variants, and pricing
- Look up customer orders and account information
- Demonstrate how the federated supergraph works across subgraphs

When using tools, briefly explain what you're doing so attendees learn how AI agents interact with GraphQL APIs. Keep responses concise and educational.`;

app.post('/api/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const { messages } = req.body;
  const mcpServerUrl = process.env.MCP_SERVER_URL;

  if (!process.env.ANTHROPIC_API_KEY) {
    send({ type: 'error', message: 'ANTHROPIC_API_KEY is not configured on this server.' });
    res.end();
    return;
  }

  const params = {
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages,
  };

  const requestOptions = {};
  if (mcpServerUrl) {
    params.mcp_servers = [{ type: 'url', url: mcpServerUrl, name: 'graphos' }];
    requestOptions.headers = { 'anthropic-beta': 'mcp-client-2025-04-04' };
  }

  try {
    const stream = anthropic.messages.stream(params, requestOptions);

    let currentToolId = null;
    let toolInputBuffer = '';

    for await (const event of stream) {
      switch (event.type) {
        case 'content_block_start':
          if (event.content_block.type === 'tool_use') {
            currentToolId = event.content_block.id;
            toolInputBuffer = '';
            send({ type: 'tool_start', id: currentToolId, name: event.content_block.name });
          }
          break;

        case 'content_block_delta':
          if (event.delta.type === 'text_delta') {
            send({ type: 'text', text: event.delta.text });
          } else if (event.delta.type === 'input_json_delta') {
            toolInputBuffer += event.delta.partial_json;
          }
          break;

        case 'content_block_stop':
          if (currentToolId) {
            let parsedInput = toolInputBuffer;
            try { parsedInput = JSON.parse(toolInputBuffer); } catch { /* keep as string */ }
            send({ type: 'tool_end', id: currentToolId, input: parsedInput });
            currentToolId = null;
            toolInputBuffer = '';
          }
          break;
      }
    }

    const finalMsg = await stream.finalMessage();
    send({ type: 'done', stop_reason: finalMsg.stop_reason });
  } catch (err) {
    console.error('Chat API error:', err);
    send({ type: 'error', message: err.message || 'An error occurred' });
  }

  res.end();
});

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'set' : 'NOT SET'}`);
  console.log(`MCP_SERVER_URL: ${process.env.MCP_SERVER_URL || '(not configured)'}`);
});
