import { ComponentProps, FC, lazy, Suspense, useState } from 'react';
import { GuessInput } from './GuessInput';

const HowToPlayModal = lazy(() =>
  import('../HowToPlayModal/HowToPlayModal').then((m) => ({ default: m.HowToPlayModal }))
);

type GuessInputWithHelpProps = Omit<ComponentProps<typeof GuessInput>, 'onJumbleHelp'> & {
  onHelpOpenChange?: (opened: boolean) => void;
};

/** The game's guess input, whose first-time Letter Jumble note opens How to Play on Jumble. */
export const GuessInputWithHelp: FC<GuessInputWithHelpProps> = ({ onHelpOpenChange, ...props }) => {
  const [helpOpen, setHelpOpen] = useState(false);
  const changeHelpOpen = (opened: boolean) => {
    setHelpOpen(opened);
    onHelpOpenChange?.(opened);
  };
  return (
    <>
      <GuessInput {...props} onJumbleHelp={() => changeHelpOpen(true)} />
      {helpOpen && (
        <Suspense fallback={null}>
          <HowToPlayModal opened onClose={() => changeHelpOpen(false)} initialTopic="jumble" />
        </Suspense>
      )}
    </>
  );
};
