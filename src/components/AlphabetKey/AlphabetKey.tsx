import { FC, useEffect, useRef, useState } from 'react';
import { Box } from '@mantine/core';
import { LetterStatus } from '@/utils/wordUtils';
import classes from './AlphabetKey.module.css';

interface AlphabetKeyProps {
  letter: string;
  statuses?: LetterStatus[];
  onClick: () => void;
  activeKey: string | null;
}

export const AlphabetKey: FC<AlphabetKeyProps> = ({ letter, statuses, onClick, activeKey }) => {
  const [isPressed, setIsPressed] = useState(false);
  const lowerValue = letter.toLowerCase();
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined); // 2. Create a ref to hold the timer

  useEffect(() => {
    if (activeKey === lowerValue) {
      setIsPressed(false);
      clearTimeout(timerRef.current);

      // 2. Use a micro-timeout to apply the 'pressed' state on the next browser paint.
      //    This forces the animation to restart every time.
      timerRef.current = setTimeout(() => {
        setIsPressed(true);
        // 3. Set another timer to remove the class after the animation.
        timerRef.current = setTimeout(() => {
          setIsPressed(false);
        }, 200); // This should be your animation duration
      }, 10); // A tiny delay is all that's needed
    }
  }, [activeKey, lowerValue]);

  // This effect ensures the timer is cleaned up if the component is ever removed
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const keyClassName = `${classes.key} ${classes[status]} ${isPressed ? classes.pressed : ''}`;

  return (
    <Box className={keyClassName} onClick={() => onClick()}>
      <div className={classes.dotsContainer}>
        {statuses?.map((status, index) => (
          <div key={index} className={classes.dot} data-status={status} />
        ))}
      </div>
      {letter}
    </Box>
  );
};
