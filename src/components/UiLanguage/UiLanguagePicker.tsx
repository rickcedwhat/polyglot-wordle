import { FC, useEffect, useRef, useState } from 'react';
import { IconLanguage } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Button, Modal, Select, Stack, Text, UnstyledButton } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { currentUiLanguage, setUiLanguage } from '@/i18n';
import { NATIVE_NAMES, readSavedUiLanguage, UI_LANGUAGES } from '@/i18n/uiLanguage';
import type { Language } from '@/types/firestore';
import { showToast } from '@/utils/toast';
import classes from './UiLanguagePicker.module.css';

/** Applies a language here and, when signed in, saves it to the account. */
const useChooseUiLanguage = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return async (language: Language) => {
    await setUiLanguage(language);
    if (!currentUser) {
      return;
    }
    try {
      await updateDoc(doc(getFirestore(), 'users', currentUser.uid), { uiLanguage: language });
      await queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser.uid] });
    } catch {
      showToast({ message: t('uiLanguage.saveFailed'), color: 'orange' });
    }
  };
};

/** Compact picker for the sign-in page. */
export const UiLanguageSelect: FC = () => {
  const { t, i18n } = useTranslation();
  const choose = useChooseUiLanguage();
  return (
    <Select
      aria-label={t('uiLanguage.menu')}
      leftSection={<IconLanguage size={16} />}
      value={i18n.language}
      onChange={(value) => value && choose(value as Language)}
      data={UI_LANGUAGES.map((lang) => ({ value: lang, label: NATIVE_NAMES[lang] }))}
      allowDeselect={false}
      comboboxProps={{ withinPortal: true }}
    />
  );
};

/** Asks which language to use for menus and instructions. */
export const UiLanguageModal: FC<{ opened: boolean; onClose: () => void }> = ({
  opened,
  onClose,
}) => {
  const { t } = useTranslation();
  const choose = useChooseUiLanguage();
  const [selected, setSelected] = useState<Language>(currentUiLanguage);

  useEffect(() => {
    if (opened) {
      setSelected(currentUiLanguage());
    }
  }, [opened]);

  const confirm = async () => {
    onClose();
    await choose(selected);
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('uiLanguage.title')} centered size="sm">
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          {t('uiLanguage.intro')}
        </Text>
        <Stack gap={6} role="radiogroup" aria-label={t('uiLanguage.title')}>
          {UI_LANGUAGES.map((lang) => (
            <UnstyledButton
              key={lang}
              role="radio"
              aria-checked={selected === lang}
              lang={lang}
              className={classes.option}
              data-selected={selected === lang || undefined}
              onClick={() => setSelected(lang)}
            >
              {NATIVE_NAMES[lang]}
            </UnstyledButton>
          ))}
        </Stack>
        <Button onClick={confirm}>{t('uiLanguage.confirm')}</Button>
      </Stack>
    </Modal>
  );
};

/**
 * Keeps the interface language in step with the account: a language saved on the account wins;
 * a choice made on this device before signing in is saved to the account; otherwise the player
 * is asked once, with the link's or browser's language preselected.
 */
export const UiLanguageSync: FC = () => {
  const { currentUser } = useAuth();
  const { data: profile } = useUserProfile(currentUser?.uid);
  const choose = useChooseUiLanguage();
  const [asking, setAsking] = useState(false);
  const handled = useRef<{ uid: string; language?: Language } | null>(null);

  useEffect(() => {
    if (!currentUser) {
      handled.current = null;
      setAsking(false);
      return;
    }
    if (!profile) {
      return;
    }
    if (profile.uiLanguage) {
      if (
        handled.current?.uid === currentUser.uid &&
        handled.current.language === profile.uiLanguage
      ) {
        return;
      }
      handled.current = { uid: currentUser.uid, language: profile.uiLanguage };
      if (profile.uiLanguage !== currentUiLanguage()) {
        setUiLanguage(profile.uiLanguage);
      }
      return;
    }
    if (handled.current?.uid === currentUser.uid) {
      return;
    }
    handled.current = { uid: currentUser.uid };
    const saved = readSavedUiLanguage();
    if (saved) {
      choose(saved);
    } else {
      setAsking(true);
    }
  }, [currentUser, profile, choose]);

  return <UiLanguageModal opened={asking} onClose={() => setAsking(false)} />;
};
