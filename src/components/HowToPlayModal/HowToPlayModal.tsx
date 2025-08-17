import { FC } from 'react';
import { Carousel } from '@mantine/carousel';
import { Center, Image, Modal, Paper, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { MAX_GUESSES } from '@/config';
import classes from './HowToPlayModal.module.css';

interface HowToPlayModalProps {
  opened: boolean;
  onClose: () => void;
}

export const HowToPlayModal: FC<HowToPlayModalProps> = ({ opened, onClose }) => {
  // Use Mantine's hook to check for mobile screen sizes (breakpoint: sm)
  const isMobile = useMediaQuery(`(max-width: 576px)`);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="How to Play Polyglot Wordle"
      fullScreen={isMobile} // Go full-screen on mobile
      size="lg"
      centered={!isMobile} // Only center on larger screens
      classNames={{
        inner: classes.modalInner,
        title: classes.modalTitle, // Add this line
      }}
    >
      <Carousel
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
        <HowToPlaySlides />
      </Carousel>
    </Modal>
  );
};

export const HowToPlaySlides: FC = () => {
  return (
    <>
      <Carousel.Slide>
        <Paper p="xl" className={classes.slide}>
          <Title order={3} mt="md" className={classes.title}>
            Three Games at Once
          </Title>
          <Text className={classes.text}>
            You have to solve for three 5-letter words simultaneously: one in English, one in
            Spanish, and one in French.
          </Text>
          <Center mt="lg">
            <Image
              src="/screenshots/how-to-play-1.png"
              alt="Three game boards"
              className={classes.image}
            />
          </Center>
        </Paper>
      </Carousel.Slide>

      <Carousel.Slide>
        <Paper p="xl" className={classes.slide}>
          <Title order={3} mt="md" className={classes.title}>
            Color Clues for Letters
          </Title>
          <Text className={classes.text}>
            Just like classic wordle, the color of the tiles will change to show how close your
            guess was.
          </Text>
          <Center mt="lg">
            <Image
              src="/screenshots/how-to-play-2.png"
              alt="Color clues for letters"
              className={classes.image}
            />
          </Center>
          <Text mt="sm">
            <Text span fw={700} c="green">
              Green:
            </Text>{' '}
            Correct letter, correct spot.
          </Text>
          <Text>
            <Text span fw={700} c="yellow">
              Yellow:
            </Text>{' '}
            Correct letter, wrong spot.
          </Text>
          <Text>
            <Text span fw={700}>
              Gray:
            </Text>{' '}
            Letter is not in the word.
          </Text>
        </Paper>
      </Carousel.Slide>

      <Carousel.Slide>
        <Paper p="xl" className={classes.slide}>
          <Title order={3} mt="md" className={classes.title}>
            Each board corresponds to a language
          </Title>
          <Text className={classes.text}>
            A green line will appear beneath a word if it matches the current board's language
          </Text>
          <Center mt="lg">
            <Image
              src="/screenshots/how-to-play-3.png"
              alt="Underlined word in English board"
              className={classes.image}
            />
          </Center>
        </Paper>
      </Carousel.Slide>
      <Carousel.Slide>
        <Paper p="xl" className={classes.slide}>
          <Title order={3} mt="md" className={classes.title}>
            Winning
          </Title>
          <Text className={classes.text}>
            You have {MAX_GUESSES} guesses to solve all three words.
          </Text>
          <Center mt="lg">
            <Image
              src="/screenshots/how-to-play-4.png"
              alt="Winning screen with solved words"
              className={classes.image}
            />
          </Center>
        </Paper>
      </Carousel.Slide>
    </>
  );
};
