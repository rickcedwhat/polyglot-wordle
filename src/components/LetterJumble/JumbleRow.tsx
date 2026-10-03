import { FC, useRef } from 'react';
import { IconPin } from '@tabler/icons-react';
import type { JumbleSlot } from '@/utils/letterJumble';
import type { LetterStatus } from '@/utils/wordUtils';
import { LetterTile } from '../LetterTile/LetterTile';
import classes from './JumbleRow.module.css';

const LONG_PRESS_MS = 450;

interface JumbleRowProps {
  slots: JumbleSlot[];
  cursorIndex: number;
  /** How each letter reads against the target board. */
  statuses?: LetterStatus[];
  /** Locked letters that are already grey on the target board. */
  conflicts?: boolean[];
  isInvalid?: boolean;
  onTileClick: (index: number) => void;
  onTileLongPress?: (index: number) => void;
}

export const JumbleRow: FC<JumbleRowProps> = ({
  slots,
  cursorIndex,
  statuses,
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
          aria-label={`Slot ${i + 1}: ${letter || 'empty'}${letter && lock !== 'kept' ? `, ${lock}` : ''}`}
          onKeyDown={(event) => {
            if (event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
            } else if (event.key === 'Enter') {
              onTileClick(i);
            }
          }}
          onKeyUp={(event) => event.key === ' ' && onTileClick(i)}
          data-lock={letter ? lock : 'kept'}
          data-status={statuses?.[i] ?? 'unknown'}
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
            status={statuses?.[i] ?? 'unknown'}
            hasCursor={i === cursorIndex}
            onClick={() => {}}
          />
          {letter && lock === 'pinned' && (
            <span className={classes.badge}>
              <IconPin size={12} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
