import { FC } from 'react';
import { Box } from '@mantine/core';
import { LetterStatus } from '@/utils/wordUtils';
import classes from './MiniTile.module.css';

interface MiniTileProps {
  status: LetterStatus;
}

export const MiniTile: FC<MiniTileProps> = ({ status }) => (
  <Box className={classes.tile} data-status={status} />
);
