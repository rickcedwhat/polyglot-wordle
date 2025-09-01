import { FC, useState } from 'react';
import { IconCheck, IconShare } from '@tabler/icons-react';
import { Tooltip } from '@mantine/core';
import { BlurButton as Button } from '../BlurButton/BlurButton';

export const ShareProfileButton: FC = () => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = 'Come play Polyglot Wordle with me and add me as a friend!';

    // Use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Polyglot Wordle Profile',
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
    <Tooltip label={copied ? 'Link Copied!' : 'Copy profile link'} opened={copied} withArrow>
      <Button
        onClick={handleShare}
        leftSection={copied ? <IconCheck size={16} /> : <IconShare size={16} />}
        variant="light"
      >
        Share Profile
      </Button>
    </Tooltip>
  );
};
