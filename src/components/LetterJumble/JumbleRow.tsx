import { FC, useRef } from 'react';
import { IconLock, IconPin } from '@tabler/icons-react';
import type { JumbleSlot } from '@/utils/letterJumble';
import { LetterTile } from '../LetterTile/LetterTile';
import classes from './JumbleRow.module.css';

const LONG_PRESS_MS = 450;

interface JumbleRowProps {
  slots: JumbleSlot[];
  cursorIndex: number;
  /** Locked letters that are already grey on the target board. */
  conflicts?: boolean[];
  isInvalid?: boolean;
  onTileClick: (index: number) => void;
  onTileLongPress?: (index: number) => void;
}

export const JumbleRow: FC<JumbleRowProps> = ({
  slots,
  cursorIndex,
  conflicts,
  isInvalid,
  onTileClick,
  onTileLongPress,
}) => {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressed = useRef(false);

  const startPress = (index: number) => {
    longPressed.current = false;
    if (!onTileLongPress) {
      return;
    }
    timer.current = setTimeout(() => {
      longPressed.current = true;
      onTileLongPress(index);
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => clearTimeout(timer.current);

  return (
    <div className={`${classes.row} ${isInvalid ? classes.shake : ''}`}>
      {slots.map(({ letter, lock }, i) => (
        <div
          key={i}
          className={classes.slot}
          role="button"
          tabIndex={0}
          aria-label={`Slot ${i + 1}: ${letter || 'empty'}${letter && lock !== 'free' ? `, ${lock} locked` : ''}`}
          onKeyDown={(event) => event.key === 'Enter' && onTileClick(i)}
          data-lock={letter ? lock : 'free'}
          data-conflict={!!conflicts?.[i]}
          onPointerDown={() => startPress(i)}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onContextMenu={(event) => onTileLongPress && event.preventDefault()}
          onClick={() => {
            if (!longPressed.current) {
              onTileClick(i);
            }
          }}
        >
          <LetterTile
            letter={letter}
            isEmpty
            status="unknown"
            hasCursor={i === cursorIndex}
            onClick={() => {}}
          />
          {letter && lock !== 'free' && (
            <span className={classes.badge}>
              {lock === 'spot' ? <IconPin size={12} /> : <IconLock size={12} />}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
