import { motion, Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Carousel } from '@mantine/carousel';
import { Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DifficultyModal } from '@/components/DifficultyModal/DifficultyModal';
import { HowToPlaySlides } from '@/components/HowToPlayModal/HowToPlayModal';
import { LanguagePickerModal } from '@/components/LanguagePickerModal/LanguagePickerModal';
import { useAuth } from '@/context/AuthContext';
import { useGameActions } from '@/hooks/useGameActions';
import type { LanguageCombo } from '@/types/firestore';
import classes from './Home.page.module.css';

export function HomePage() {
  const { createNewGame, preferencesNotSet, shouldAskLanguages } = useGameActions();
  const { currentUser, signInWithGoogle } = useAuth();
  const [difficultyModalOpened, { open: openDifficultyModal, close: closeDifficultyModal }] =
    useDisclosure(false);
  const [languageModalOpened, { open: openLanguageModal, close: closeLanguageModal }] =
    useDisclosure(false);

  const handleNewGameClick = () => {
    if (preferencesNotSet) {
      openDifficultyModal();
    } else if (shouldAskLanguages) {
      openLanguageModal();
    } else {
      createNewGame();
    }
  };

  const handleLanguageConfirm = (languages: LanguageCombo) => {
    createNewGame({ languages });
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
      <LanguagePickerModal
        opened={languageModalOpened}
        onClose={closeLanguageModal}
        startGameOnConfirm
        onConfirm={handleLanguageConfirm}
      />
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
          {import.meta.env.DEV && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Button component={Link} to="/sandbox" variant="subtle" size="xs" color="gray">
                🧪 Open UI Sandbox Mode
              </Button>
              <Button component={Link} to="/dictionaries" variant="subtle" size="xs" color="indigo">
                📖 Browse Dictionaries
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
