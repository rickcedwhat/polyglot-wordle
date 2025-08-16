import { forwardRef, useCallback, type ComponentPropsWithoutRef } from 'react';
import { Button, ButtonProps } from '@mantine/core';

const blurActiveElement = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

// 1. Combine Mantine's ButtonProps with all standard button attributes
//    like `onClick`, `onMouseEnter`, etc.
export type BlurButtonProps = ButtonProps & ComponentPropsWithoutRef<'button'>;

export const BlurButton = forwardRef<HTMLButtonElement, BlurButtonProps>(
  ({ onClick, ...rest }, ref) => {
    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        // Call the original onClick handler if it was provided
        onClick?.(event);

        // Then, automatically call our blur utility.
        blurActiveElement();
      },
      [onClick]
    );

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        {...rest} // Pass all other props through.
      />
    );
  }
);
