import { FC } from 'react';
import { Box, Text } from '@mantine/core';
import { splitDefinition } from '@/utils/wordUtils';

interface FormattedDefinitionProps {
  def?: string;
  size?: 'xs' | 'sm' | 'md';
  withBullet?: boolean;
}

export const FormattedDefinition: FC<FormattedDefinitionProps> = ({
  def = '',
  size = 'sm',
  withBullet = true,
}) => {
  const { main, note } = splitDefinition(def);

  if (!main) {
    return null;
  }

  return (
    <Box>
      <Text size={size} style={{ lineHeight: 1.35 }}>
        {withBullet ? '• ' : ''}
        {main}
      </Text>
      {note && (
        <Text
          size="xs"
          c="dimmed"
          fs="italic"
          style={{
            lineHeight: 1.25,
            paddingLeft: withBullet ? '12px' : '0px',
            marginTop: 2,
          }}
        >
          ↳ {note}
        </Text>
      )}
    </Box>
  );
};
