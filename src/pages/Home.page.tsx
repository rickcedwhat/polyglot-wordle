import { motion, Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Carousel } from '@mantine/carousel';
import { Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { GameSetupDialog } from '@/components/GameSetup/GameSetupDialog';
import { HowToPlaySlides } from '@/components/HowToPlayModal/HelpSlides';
import { useAuth } from '@/context/AuthContext';
import { useGameActions } from '@/hooks/useGameActions';
import classes from './Home.page.module.css';

export function HomePage() {
  const { createNewGame, needsSetup } = useGameActions();
  const { currentUser, signInWithGoogle } = useAuth();
  const { t } = useTranslation();
  const [setupOpened, { open: openSetup, close: closeSetup }] = useDisclosure(false);

  const handleNewGameClick = () => {
    if (needsSetup) {
      openSetup();
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
      <GameSetupDialog opened={setupOpened} onClose={closeSetup} mode="newGame" />
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
              {t('nav.startNewGame')}
            </Button>
          ) : (
            <Button size="xl" onClick={signInWithGoogle} variant="gradient">
              {t('nav.logIn')}
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
