import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Badge,
  Box,
  Code,
  Collapse,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  Tooltip,
  VStack,
  useDisclosure,
} from '@chakra-ui/react';
import { FaRobot, FaChevronDown, FaChevronUp, FaWrench } from 'react-icons/fa';
import { MdSend } from 'react-icons/md';

function ToolBlock({ name, input, streaming }) {
  const [expanded, setExpanded] = useState(false);
  const hasInput = input !== null && input !== undefined && input !== '';
  const inputStr = hasInput
    ? typeof input === 'object' ? JSON.stringify(input, null, 2) : String(input)
    : '';

  return (
    <Box
      bg="orange.50"
      border="1px solid"
      borderColor="orange.200"
      borderRadius="md"
      p={2}
      w="100%"
      fontSize="xs"
    >
      <HStack justify="space-between">
        <HStack spacing={1}>
          {streaming ? (
            <Spinner size="xs" color="orange.500" />
          ) : (
            <Box as={FaWrench} color="orange.400" boxSize={3} />
          )}
          <Text fontWeight="bold" color="orange.700">
            {name}
          </Text>
          <Badge colorScheme="orange" fontSize="2xs" variant="subtle">
            MCP tool
          </Badge>
        </HStack>
        {inputStr && !streaming && (
          <IconButton
            icon={expanded ? <FaChevronUp /> : <FaChevronDown />}
            size="xs"
            variant="ghost"
            colorScheme="orange"
            aria-label="Toggle input"
            onClick={() => setExpanded(!expanded)}
          />
        )}
      </HStack>
      {inputStr && !streaming && (
        <Collapse in={expanded}>
          <Box mt={2} maxH="200px" overflowY="auto" borderRadius="sm">
            <Code
              display="block"
              fontSize="2xs"
              whiteSpace="pre"
              bg="orange.100"
              color="orange.900"
              p={2}
              borderRadius="sm"
            >
              {inputStr}
            </Code>
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

function MessageItem({ item }) {
  if (item.type === 'user') {
    return (
      <Flex justify="flex-end" w="100%">
        <Box
          bg="blue.500"
          color="white"
          px={3}
          py={2}
          borderRadius="lg"
          borderBottomRightRadius="sm"
          maxW="82%"
          fontSize="sm"
          whiteSpace="pre-wrap"
        >
          {item.content}
        </Box>
      </Flex>
    );
  }

  if (item.type === 'assistant') {
    return (
      <Flex justify="flex-start" w="100%">
        <Box
          bg="gray.100"
          px={3}
          py={2}
          borderRadius="lg"
          borderBottomLeftRadius="sm"
          maxW="85%"
          fontSize="sm"
          whiteSpace="pre-wrap"
          color="gray.800"
        >
          {item.content}
          {item.streaming && (
            <Box
              as="span"
              display="inline-block"
              w="2px"
              h="14px"
              bg="gray.500"
              ml="1px"
              verticalAlign="text-bottom"
              sx={{ animation: 'blink 1s step-end infinite' }}
            />
          )}
        </Box>
      </Flex>
    );
  }

  if (item.type === 'tool') {
    return (
      <Flex justify="flex-start" w="100%" pl={1}>
        <Box maxW="90%" w="100%">
          <ToolBlock name={item.name} input={item.input} streaming={item.streaming} />
        </Box>
      </Flex>
    );
  }

  if (item.type === 'error') {
    return (
      <Flex justify="flex-start" w="100%">
        <Box
          bg="red.50"
          border="1px solid"
          borderColor="red.200"
          px={3}
          py={2}
          borderRadius="lg"
          maxW="85%"
          fontSize="sm"
        >
          <Text color="red.600" fontWeight="bold" fontSize="xs" mb={1}>
            Error
          </Text>
          <Text color="red.800">{item.content}</Text>
        </Box>
      </Flex>
    );
  }

  return null;
}

export default function AgentPanel() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [displayItems, setDisplayItems] = useState([]);
  const [apiMessages, setApiMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const nextIdRef = useRef(0);
  const assembledTextRef = useRef('');
  const currentToolIdRef = useRef(null);

  const getId = () => {
    nextIdRef.current += 1;
    return nextIdRef.current;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayItems]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || loading) return;

    const newMsg = { role: 'user', content: text };
    const updatedHistory = [...apiMessages, newMsg];

    setInputValue('');
    setLoading(true);
    assembledTextRef.current = '';
    currentToolIdRef.current = null;

    setDisplayItems(prev => [...prev, { id: getId(), type: 'user', content: text }]);
    setApiMessages(updatedHistory);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedHistory }),
      });

      if (!response.ok) {
        throw new Error(`Server error: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (split on double newline)
        const parts = sseBuffer.split('\n\n');
        sseBuffer = parts.pop() ?? '';

        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            let event;
            try { event = JSON.parse(line.slice(6)); } catch { continue; }

            if (event.type === 'text') {
              assembledTextRef.current += event.text;
              const snap = assembledTextRef.current;
              setDisplayItems(prev => {
                const last = prev[prev.length - 1];
                if (last?.type === 'assistant' && last.streaming) {
                  return [...prev.slice(0, -1), { ...last, content: snap }];
                }
                return [...prev, { id: getId(), type: 'assistant', content: snap, streaming: true }];
              });
            } else if (event.type === 'tool_start') {
              const toolItemId = getId();
              currentToolIdRef.current = toolItemId;
              setDisplayItems(prev => {
                // Close any open streaming assistant text
                const updated = prev.map(item =>
                  item.type === 'assistant' && item.streaming
                    ? { ...item, streaming: false }
                    : item
                );
                return [...updated, { id: toolItemId, type: 'tool', name: event.name, input: null, streaming: true }];
              });
            } else if (event.type === 'tool_end') {
              const toolItemId = currentToolIdRef.current;
              setDisplayItems(prev => prev.map(item =>
                item.id === toolItemId ? { ...item, input: event.input, streaming: false } : item
              ));
              currentToolIdRef.current = null;
            } else if (event.type === 'done') {
              setDisplayItems(prev =>
                prev.map(item => item.streaming ? { ...item, streaming: false } : item)
              );
              const finalText = assembledTextRef.current;
              if (finalText) {
                setApiMessages(msgs => [...msgs, { role: 'assistant', content: finalText }]);
              }
            } else if (event.type === 'error') {
              setDisplayItems(prev => {
                const cleaned = prev.filter(item => !item.streaming);
                return [...cleaned, { id: getId(), type: 'error', content: event.message }];
              });
            }
          }
        }
      }
    } catch (err) {
      setDisplayItems(prev => {
        const cleaned = prev.filter(item => !item.streaming);
        return [...cleaned, { id: getId(), type: 'error', content: err.message }];
      });
    } finally {
      setLoading(false);
    }
  }, [inputValue, loading, apiMessages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmpty = displayItems.length === 0;

  return (
    <>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      <Tooltip label="Ask AI about this supergraph" placement="left">
        <IconButton
          icon={<FaRobot size={18} />}
          colorScheme="blue"
          borderRadius="full"
          size="lg"
          position="fixed"
          bottom="6"
          right="6"
          zIndex={1000}
          shadow="xl"
          onClick={onOpen}
          aria-label="Open AI assistant"
          _hover={{ transform: 'scale(1.05)' }}
          transition="transform 0.15s"
        />
      </Tooltip>

      <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" pb={3}>
            <HStack spacing={2}>
              <Box as={FaRobot} color="blue.500" boxSize={5} />
              <Text fontSize="md" fontWeight="bold">KBT Threads AI Assistant</Text>
            </HStack>
            <Text fontSize="xs" fontWeight="normal" color="gray.500" mt={0.5}>
              Powered by Claude + Apollo MCP Server
            </Text>
          </DrawerHeader>

          <DrawerBody p={3} overflowY="auto" bg="white">
            {isEmpty ? (
              <VStack spacing={3} pt={10} color="gray.400" textAlign="center" px={4}>
                <Box as={FaRobot} boxSize={10} />
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Ask me about the KBT Threads supergraph
                </Text>
                <VStack spacing={1} fontSize="xs" color="gray.500">
                  <Text>"What products are available?"</Text>
                  <Text>"Show me the GraphQL schema"</Text>
                  <Text>"Tell me about the federation setup"</Text>
                </VStack>
              </VStack>
            ) : (
              <VStack spacing={2} align="stretch">
                {displayItems.map(item => (
                  <MessageItem key={item.id} item={item} />
                ))}
                <div ref={messagesEndRef} />
              </VStack>
            )}
          </DrawerBody>

          <DrawerFooter borderTopWidth="1px" p={3}>
            <HStack w="100%" spacing={2}>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about products, orders, schema..."
                size="sm"
                isDisabled={loading}
                borderRadius="full"
                pr={2}
              />
              <IconButton
                icon={loading ? <Spinner size="xs" /> : <MdSend size={16} />}
                colorScheme="blue"
                size="sm"
                borderRadius="full"
                onClick={sendMessage}
                isDisabled={!inputValue.trim() || loading}
                aria-label="Send message"
              />
            </HStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
