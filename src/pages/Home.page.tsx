import { motion, Variants } from 'framer-motion';
import { Carousel } from '@mantine/carousel';
import { Button, Image, Paper, Text, Title } from '@mantine/core';
import { useGameActions } from '@/hooks/useGameActions';
import classes from './Home.page.module.css';

export function HomePage() {
  const { createNewGame } = useGameActions();

  // Animation variants for Framer Motion
  const containerVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.25 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <motion.div
      className={classes.root}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className={classes.inner}>
        <motion.div variants={itemVariants} className={classes.carouselWrapper}>
          <Carousel
            className={classes.carousel}
            withIndicators
            emblaOptions={{
              loop: true,
              dragFree: false,
              align: 'center',
            }}
          >
            <Carousel.Slide>
              <Paper className={classes.slide}>
                <Title order={3}>Three Games at Once</Title>
                <Text mt="md">
                  Solve for three 5-letter words simultaneously: one in English, one in Spanish, and
                  one in French.
                </Text>
                <Image
                  src="/screenshots/how-to-play-1.png"
                  alt="Three game boards"
                  className={classes.image}
                />
              </Paper>
            </Carousel.Slide>
            <Carousel.Slide>
              <Paper className={classes.slide}>
                <Title order={3}>Check the Colors</Title>
                <Text mt="md">The tile colors show how close your guess was.</Text>
                <Image
                  src="/screenshots/how-to-play-2.png"
                  alt="Color clues for letters"
                  className={classes.image}
                />
              </Paper>
            </Carousel.Slide>
            <Carousel.Slide>
              <Paper className={classes.slide}>
                <Title order={3}>Click for Definitions</Title>
                <Text mt="md">
                  After submitting a valid guess, click the row to get the word's definition.
                </Text>
                <Image
                  src="/screenshots/how-to-play-3.png"
                  alt="Keyboard with colored keys"
                  className={classes.image}
                />
              </Paper>
            </Carousel.Slide>
          </Carousel>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button size="xl" onClick={createNewGame} variant="gradient">
            Start a New Game
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
