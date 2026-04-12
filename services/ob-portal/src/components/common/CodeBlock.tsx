import { CodeHighlight } from '@mantine/code-highlight';
import { Box, CopyButton, ActionIcon, Tooltip, Group, Text } from '@mantine/core';
import { IconCopy, IconCheck } from '@tabler/icons-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  withCopy?: boolean;
}

export function CodeBlock({ code, language = 'json', title, withCopy = true }: CodeBlockProps) {
  return (
    <Box style={{ position: 'relative' }}>
      {(title || withCopy) && (
        <Group
          justify="space-between"
          px="md"
          py="xs"
          style={{
            backgroundColor: 'var(--mantine-color-gray-1)',
            borderTopLeftRadius: 'var(--mantine-radius-md)',
            borderTopRightRadius: 'var(--mantine-radius-md)',
            borderBottom: '1px solid var(--mantine-color-gray-3)',
          }}
        >
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            {title || language}
          </Text>
          {withCopy && (
            <CopyButton value={code}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                  <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy} size="sm">
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          )}
        </Group>
      )}
      <CodeHighlight
        code={code}
        language={language}
        styles={{
          root: {
            borderTopLeftRadius: title || withCopy ? 0 : undefined,
            borderTopRightRadius: title || withCopy ? 0 : undefined,
          },
        }}
      />
    </Box>
  );
}
