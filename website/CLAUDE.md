# Website — KBT Threads Frontend

## Overview

A React (Create React App) frontend for the KBT Threads workshop scenario. It serves as the attendee-facing UI that consumes the Apollo supergraph, demonstrating a real e-commerce application powered by the federated GraphQL API.

## Tech Stack

- **React 17** with React Router v5 (client-side routing)
- **Apollo Client 3** (`@apollo/client`) for GraphQL queries
- **Chakra UI v1** for component library / styling
- **Served at runtime** via `npx serve` (static build)

## Architecture

```
src/
├── index.js          # Apollo Client setup, ChakraProvider, app bootstrap
├── App.js            # Router with page routes
├── config.js         # Default router URL constant
├── theme.js          # Chakra UI theme overrides
├── layout/
│   └── Layout.js     # Nav + Container wrapper for all pages
├── components/       # Reusable UI components
│   ├── Nav.js        # Top nav (Home, Account, Configure links)
│   ├── ProductCard.js
│   ├── ReviewCard.js
│   ├── ReviewRating.js
│   ├── Button.js
│   ├── DelaySlider.js
│   └── Spinner.js
└── pages/
    ├── Homepage.js   # Featured products grid (GET_FEATURED_PRODUCTS)
    ├── Product.js    # Product detail with variants/@defer (GET_PRODUCT_DETAILS)
    ├── Account.js    # User account, orders, cart (GET_ACCOUNT_SUMMARY)
    ├── Configuration.js  # Runtime router URL config (stored in localStorage)
    ├── Error.js
    ├── Fallback.js
    └── index.js      # Page exports
```

## Runtime Configuration

The router URL is configured at **runtime** (not build time) to allow a single Docker image to be deployed per-attendee with their own router URL:

1. `public/config.js` contains a placeholder: `window.APP_CONFIG = { routerUrl: '__ROUTER_URL__' }`
2. `start.sh` runs `sed` at container startup to replace `__ROUTER_URL__` with the `ROUTER_URL` env var
3. `src/index.js` reads `window.APP_CONFIG?.routerUrl` first, then falls back to `process.env.REACT_APP_ROUTER_URL`, then `DEFAULT_ROUTER_URL` from `src/config.js`
4. The **Configuration page** (`/config`) allows attendees to override the router URL in `localStorage` at runtime — useful for pointing to their own deployed router

Default router URL: `router-j3nprurqka-ue.a.run.app` (shared workshop infrastructure)

## GraphQL Operations

| Page | Operation | Key fields fetched |
|---|---|---|
| Homepage | `HomePageFeaturedProducts` | `getFeaturedProducts { id, name, price, description, images, shortDescription }` |
| Product | `GetProductDetails` | `product { id, name, description, price, images, variants @defer { colorway, size, inStock, id } }` |
| Account | `getAccountSummary` | `user { firstName, lastName, email, address, activeCart { items, subtotal }, orders { id, items } }` |

Notable: `Product.js` uses `@defer` on the `variants` field to progressively load size/color options.

## Deployment

### Docker
- Base image: `node:18-alpine`
- Build: `npm run build` (CRA static build)
- Runtime: `npx serve build` via `start.sh`
- Port: **3000**
- Key env var: `ROUTER_URL` (injected at container start by `start.sh`)

### Cloud Build (`cloudbuild.yaml`)
- **Note:** The existing `cloudbuild.yaml` references `gcr.io/federation-workshop/front-end` and `./final/website` — this is stale/incorrect for the current repo structure and will need updating before use.

## Local Development

```bash
cd website
npm install
REACT_APP_ROUTER_URL=https://your-router-url npm start
```

## Key Conventions

- Apollo Client is configured once in `src/index.js` and provided via `ApolloProvider`
- The `Configuration` page saves the router URL to `localStorage` and reloads the window to apply it
- `Account.js` hardcodes `userId: '10'` for the workshop demo user
- ESLint is disabled during build (`DISABLE_ESLINT_PLUGIN=true`)
- The `.npmrc` file may contain registry config — check before publishing

## Planned MCP Agent Integration

The next phase of this workshop project involves adding an AI agent/chatbot panel to this UI, powered by:
- The **Claude API** (called from a backend) with the deployed **Apollo MCP Server** configured as a tool source
- The same supergraph that powers the existing pages

The agent UI should surface MCP tool calls transparently so attendees can see the AI interacting with their supergraph. Key design decisions still TBD: simple chat with visible tool calls vs. AG-UI (CopilotKit) for richer agent interactions. The backend for Claude API calls will need a new service (likely Next.js API routes or a lightweight Node.js server) deployed alongside this frontend.
