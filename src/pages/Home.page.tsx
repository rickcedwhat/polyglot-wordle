import { motion, Variants } from 'framer-motion';
import { Carousel } from '@mantine/carousel';
import { Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DifficultyModal } from '@/components/DifficultyModal/DifficultyModal';
import { HowToPlaySlides } from '@/components/HowToPlayModal/HowToPlayModal';
import { useAuth } from '@/context/AuthContext';
import { useGameActions } from '@/hooks/useGameActions';
import classes from './Home.page.module.css';

export function HomePage() {
  const { createNewGame, preferencesNotSet } = useGameActions();
  const { currentUser, signInWithGoogle } = useAuth();
  const [difficultyModalOpened, { open: openDifficultyModal, close: closeDifficultyModal }] =
    useDisclosure(false);

  const handleNewGameClick = () => {
    if (preferencesNotSet) {
      openDifficultyModal();
    } else {
      createNewGame();
    }
  };

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
      <DifficultyModal opened={difficultyModalOpened} onClose={closeDifficultyModal} />
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
            <HowToPlaySlides />
          </Carousel>
        </motion.div>

        <motion.div variants={itemVariants}>
          {currentUser ? (
            <Button size="xl" onClick={handleNewGameClick} variant="gradient">
              Start a New Game
            </Button>
          ) : (
            <Button size="xl" onClick={signInWithGoogle} variant="gradient">
              Log In
            </Button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
