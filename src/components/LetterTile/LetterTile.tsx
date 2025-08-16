import { FC } from 'react';
import { Box } from '@mantine/core';
import { useIsFirstRender } from '@/hooks/useIsFirstRender';
import { LetterStatus } from '@/utils/wordUtils';
import classes from './LetterTile.module.css';

interface LetterTileProps {
  letter: string;
  status: LetterStatus;
  hasCursor?: boolean;
  onClick?: () => void;
}

export const LetterTile: FC<LetterTileProps> = ({ letter, status, hasCursor, onClick }) => {
  const isFirstRender = useIsFirstRender(); // 2. Call the hook

  // 3. Conditionally add the shake class only if it's not the first render
  const tileClassName = `
    ${classes.tile}
    ${hasCursor && !isFirstRender ? classes.shake : ''}
  `;
  return (
    <Box
      className={tileClassName}
      data-status={status}
      onClick={onClick}
      data-has-cursor={hasCursor}
    >
      {letter}
    </Box>
  );
};
