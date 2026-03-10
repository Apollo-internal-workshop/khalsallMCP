import KBTLogo from './logo.png';
import {Box, Button, Flex, HStack, Text, Tooltip} from '@chakra-ui/react';
import {Link} from 'react-router-dom';
import {DEFAULT_ROUTER_URL} from '../config';

export default function Nav() {
  const rawUrl = window.APP_CONFIG?.routerUrl;
  const activeUrl = (rawUrl && rawUrl !== '__ROUTER_URL__')
    ? rawUrl
    : (localStorage.getItem('router-url') || DEFAULT_ROUTER_URL);

  return (
    <Flex
      flexDir="row"
      justifyContent="space-between"
      alignItems="center"
      p="4"
    >
      <Box as={Link} to="/">
        <img src={KBTLogo} alt="KBT Inc. logo" />
      </Box>
      <HStack spacing="4">
        <Tooltip label={activeUrl} placement="bottom">
          <Text fontSize="xs" color="gray.400" maxW="260px" isTruncated>
            {activeUrl}
          </Text>
        </Tooltip>
        <Box as={Link} to="/account">
          <Button>Account</Button>
        </Box>
        <Box as={Link} to="/config">
          <Button variant='outline'>Configure</Button>
        </Box>
      </HStack>
    </Flex>
  );
}
