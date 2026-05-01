'use client';

import { Container, Title, Paper, Text, Box, Button, Group } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { IconArrowLeft } from '@tabler/icons-react';

interface LegalDocumentProps {
  title: string;
  content: string;
  version: string;
  updatedAt: string;
}

export default function LegalDocument({ title, content, version, updatedAt }: LegalDocumentProps) {
  return (
    <Box bg="gray.0" mih="100vh" py={60}>
      <Container size="md">
        <Button 
          component={Link} 
          href="/" 
          variant="subtle" 
          color="gray" 
          leftSection={<IconArrowLeft size={16} />}
          mb="xl"
        >
          홈으로 돌아가기
        </Button>

        <Paper p={{ base: 'lg', sm: 50 }} radius="md" withBorder shadow="sm">
          <Box mb={40} style={{ borderBottom: '1px solid var(--mantine-color-gray-2)', paddingBottom: rem(20) }}>
            <Title order={1} mb="xs" style={{ fontSize: rem(32) }}>{title}</Title>
            <Text size="sm" c="dimmed">
              버전: {version} | 시행일: {updatedAt}
            </Text>
          </Box>

          <Box className="markdown-content" style={{ lineHeight: 1.8 }}>
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <Title order={1} mt="xl" mb="md" {...props} />,
                h2: ({node, ...props}) => <Title order={2} mt="xl" mb="md" {...props} style={{ fontSize: rem(24) }} />,
                h3: ({node, ...props}) => <Title order={3} mt="lg" mb="sm" {...props} style={{ fontSize: rem(20) }} />,
                p: ({node, ...props}) => <Text mb="md" {...props} />,
                ul: ({node, ...props}) => <Box component="ul" mb="md" style={{ paddingLeft: rem(20) }} {...props} />,
                li: ({node, ...props}) => <Box component="li" mb={5} {...props} />,
              }}
            >
              {content}
            </ReactMarkdown>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

import { rem } from '@mantine/core';
