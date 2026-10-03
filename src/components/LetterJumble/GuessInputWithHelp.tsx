import { ComponentProps, FC, lazy, Suspense, useState } from 'react';
import { GuessInput } from './GuessInput';

const HowToPlayModal = lazy(() =>
  import('../HowToPlayModal/HowToPlayModal').then((m) => ({ default: m.HowToPlayModal }))
);

type GuessInputWithHelpProps = Omit<ComponentProps<typeof GuessInput>, 'onJumbleHelp'>;

/** The game's guess input, whose first-time Letter Jumble note opens How to Play on Jumble. */
export const GuessInputWithHelp: FC<GuessInputWithHelpProps> = (props) => {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <>
      <GuessInput {...props} onJumbleHelp={() => setHelpOpen(true)} />
      {helpOpen && (
        <Suspense fallback={null}>
          <HowToPlayModal opened onClose={() => setHelpOpen(false)} initialTopic="jumble" />
        </Suspense>
      )}
    </>
  );
};
