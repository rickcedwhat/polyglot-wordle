import { FC, useState } from 'react';
import { IconCheck, IconShare } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@mantine/core';
import { BlurButton as Button } from '../BlurButton/BlurButton';

export const ShareProfileButton: FC = () => {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = t('profile.shareText');

    // Use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('profile.shareTitle'),
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
      } catch (err) {
        console.error('Failed to copy link: ', err);
      }
    }
  };

  return (
    <Tooltip
      label={copied ? t('profile.shareCopied') : t('profile.shareTooltip')}
      opened={copied}
      withArrow
    >
      <Button
        onClick={handleShare}
        leftSection={copied ? <IconCheck size={16} /> : <IconShare size={16} />}
        variant="light"
      >
        {t('profile.share')}
      </Button>
    </Tooltip>
  );
};
