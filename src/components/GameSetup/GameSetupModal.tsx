import { ComponentProps, FC } from 'react';
import { Drawer, Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { GameSetupPanel } from './GameSetupPanel';

type GameSetupModalProps = ComponentProps<typeof GameSetupPanel> & {
  opened: boolean;
  onClose: () => void;
  title?: string;
};

const DEFAULT_TITLES = {
  newGame: 'New game',
  settings: 'Game setup',
  challenge: 'Challenge a friend',
} as const;

/** Centered modal on desktop, bottom sheet on phones. */
export const GameSetupModal: FC<GameSetupModalProps> = ({
  opened,
  onClose,
  title,
  resetKey,
  ...panel
}) => {
  const isPhone = useMediaQuery('(max-width: 36em)');
  const heading = title ?? DEFAULT_TITLES[panel.mode];
  // Each opening gets a fresh picker; profile loading only seeds an untouched picker.
  const content = <GameSetupPanel key={String(opened)} {...panel} resetKey={resetKey} />;

  if (isPhone) {
    return (
      <Drawer
        opened={opened}
        onClose={onClose}
        position="bottom"
        size="auto"
        title={heading}
        styles={{
          content: {
            borderTopLeftRadius: 'var(--mantine-radius-lg)',
            borderTopRightRadius: 'var(--mantine-radius-lg)',
            maxHeight: '92dvh',
          },
          title: { fontWeight: 700 },
        }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size={440}
      title={heading}
      styles={{ title: { fontWeight: 700 } }}
    >
      {content}
    </Modal>
  );
};
