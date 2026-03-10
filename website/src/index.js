import App from './App';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client';

import theme from './theme.js';
import { ChakraProvider } from '@chakra-ui/react';
import { DEFAULT_ROUTER_URL } from './config';

// Get router URL from runtime config, environment variable, or default.
// Guard against the unsubstituted placeholder value during local development.
const rawUrl = window.APP_CONFIG?.routerUrl;
const routerUrl = (rawUrl && rawUrl !== '__ROUTER_URL__')
  ? rawUrl
  : (import.meta.env.VITE_ROUTER_URL || DEFAULT_ROUTER_URL);

console.log('Using routerUrl', routerUrl);

const client = new ApolloClient({
  cache: new InMemoryCache(),
  uri: routerUrl,
  name: 'web-workshop-client',
  version: '0.1',
});

const root = createRoot(document.getElementById('root'));
root.render(
  <ChakraProvider theme={theme}>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </ChakraProvider>
);
