import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Carousel } from '@mantine/carousel';
import { Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { HELP_TOPICS, type HelpTopic } from './HelpSlides';
import classes from './HowToPlayModal.module.css';

interface HowToPlayModalProps {
  opened: boolean;
  onClose: () => void;
  /** Help section shown when the modal opens. */
  initialTopic?: HelpTopic;
}

export const HowToPlayModal: FC<HowToPlayModalProps> = ({
  opened,
  onClose,
  initialTopic = 'play',
}) => {
  const { t } = useTranslation();
  // Use Mantine's hook to check for mobile screen sizes (breakpoint: sm)
  const isMobile = useMediaQuery(`(max-width: 576px)`);
  const topic = HELP_TOPICS.find((item) => item.value === initialTopic) ?? HELP_TOPICS[0];
  const { Slides } = topic;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t(`help.topics.${topic.value}`)}
      fullScreen={isMobile} // Go full-screen on mobile
      size="xl"
      centered={!isMobile} // Only center on larger screens
      classNames={{
        inner: classes.modalInner,
        body: classes.modalBody,
        title: classes.modalTitle,
      }}
    >
      <Carousel
        key={topic.value}
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
