import { useEffect, useRef } from 'react';

export const useIsFirstRender = (): boolean => {
  const isFirst = useRef(true);

  useEffect(() => {
    isFirst.current = false;
  }, []);

  return isFirst.current;
};
