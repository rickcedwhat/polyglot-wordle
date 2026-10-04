import { FC, useEffect, useState } from 'react';
import { Carousel } from '@mantine/carousel';
import { Modal, SegmentedControl } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { HELP_TOPICS } from './HelpSlides';
import classes from './HowToPlayModal.module.css';

type HelpTopic = (typeof HELP_TOPICS)[number]['value'];

interface HowToPlayModalProps {
  opened: boolean;
  onClose: () => void;
  /** Tab shown when the modal opens. */
  initialTopic?: HelpTopic;
}

export const HowToPlayModal: FC<HowToPlayModalProps> = ({
  opened,
  onClose,
  initialTopic = 'play',
}) => {
  // Use Mantine's hook to check for mobile screen sizes (breakpoint: sm)
  const isMobile = useMediaQuery(`(max-width: 576px)`);
  const [topic, setTopic] = useState<HelpTopic>(initialTopic);
  const { Slides } = HELP_TOPICS.find((t) => t.value === topic) ?? HELP_TOPICS[0];

  useEffect(() => {
    if (opened) {
      setTopic(initialTopic);
    }
  }, [opened, initialTopic]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="How to Play Polyglot Wordle"
      fullScreen={isMobile} // Go full-screen on mobile
      size="xl"
      centered={!isMobile} // Only center on larger screens
      classNames={{
        inner: classes.modalInner,
        body: classes.modalBody,
        title: classes.modalTitle,
      }}
    >
      <SegmentedControl
        fullWidth
        size={isMobile ? 'xs' : 'sm'}
        value={topic}
        onChange={(value) => setTopic(value as HelpTopic)}
        data={HELP_TOPICS.map(({ value, label }) => ({ value, label }))}
      />
      <Carousel
        key={topic}
        height="100%"
        withIndicators
        emblaOptions={{
          loop: true,
          dragFree: false,
          align: 'center',
        }}
        classNames={{
          root: classes.carouselRoot,
          control: classes.carouselControl,
          indicator: classes.indicator,
        }}
      >
        <Slides />
      </Carousel>
    </Modal>
  );
};
