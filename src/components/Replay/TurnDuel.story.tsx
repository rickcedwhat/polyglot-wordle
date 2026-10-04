import type { Meta, StoryObj } from '@storybook/react';
import type { Language } from '@/types/firestore';
import { TurnDuel, type DuelPlayer } from './TurnDuel';

/** A real challenge: You finished in 6 for 1366; Thiery ran out of guesses at 17. */
const WORDS = { pt: 'menti', en: 'emery', es: 'rubia' };
const LANGUAGES: Language[] = ['pt', 'en', 'es'];
const PLAYERS: DuelPlayer[] = [
  {
    id: 'me',
    name: 'You',
    color: 'blue',
    photoURL:
      'https://lh3.googleusercontent.com/a/ACg8ocLYc-QRF7SADrdItSTErJWEgJOznjiLiTDeWK05W_AvQ_iBnrOK=s200-c',
    guesses: ['prato', 'begun', 'slime', 'menti', 'emery', 'rubia'],
  },
  {
    id: 'thiery',
    name: 'Thiery',
    color: 'orange',
    photoURL:
      'https://lh3.googleusercontent.com/a-/ALV-UjVIsL0LwVnomrdVIZabfV8oWBH-zGYLO-E-HHtbcCg0WBWAuEXvpJfpZPSoStiNDYlj2Nl6g4je1wt7WKdP-7FkIsmc0nor_gD61RPsc8EM-c-Fa6F-BD4Mf04T7Kq638_OIgSxdtGg4LeZdf8-g9E-L7hOr_EIBVM4dLsVPQc1rO7eCravWeBUvq4j-hndkPtniQc77QSLeYaYOmR0Pxo04NO9iLq8xlEwJ79Ou4SAPSGTibHgaAFJAExvYTsw2M-LsIRzjpkFta9NFHpj_j5U02WKpcVoHJpMqGBFsRPUmIutwot4BtryqTj0WFDZA9bI_1IHEq_NrGPY52KzkthLSx4o3KuvHNhT9xGkIWEdFj_jyJSomsjzPAc-n5FtPC2xwF84Z8x6QS7ytzD47T470u1sihXWN2qyBobivl8O7gjYmGpE9a3UjlcYNOUqmSpbQKzR3NAzUXntjpo7eXhmABLqDDGkIwxaZxJeBEn8FoqOXcxq5dasNdjsb8czTy7Zn_cLWm5o-8DJCBQyaucBEHQMfbYHFHEEx02-Kh7sSjBNECJmZI8bM6UQWsEwucaLHiqJdE6ffeSsuqY4twl1N38w_fH60bj765yPCxVUMVhtq8wTTlo6mAQbe16XRNqL3WMI_envhMAz1Q2ZwHdpTIvWCN9esQlG9xBSaYFdDe9gOkVKmzaiv-shupRDqklebrg_asl35xkHt7BZaxKjzRLx0Yw6nwO4eBR0CXuop_j2R_D800lO3IyyLbij1-0Pxf135tOA8CgJiRnHuADyMpicFQzOFrJ3NgTDno1t3z5rJu2U-vVzuRJEg2krtGINrvEKcT1fW_mWP7n-kIIVrvos2VI30ZvVSGAcTOoQdOJk0LMIT2CgO39skQRV5T08zE9Vc1OARD9aIh6gr8KsTsSY4CKKFCmXG2_Q_o4sYbaA_fWZzItqq5Z-9a1KI_Cw_sfhHoJ505aprDFgLdYc8GraM4MCeEgzqIH4XhvgFQmZV62vlYFLNWAeJVsbiXivpVnWWlhcJE0sIrl7IIwV5-U7RzG_a_LVsmQxrx04n-el-QIAsLi4E7E=s200-c',
    guesses: ['water', 'hater', 'later', 'miner', 'menos', 'mente', 'menti', 'merge'],
  },
];

const meta: Meta<typeof TurnDuel> = {
  title: 'Replay/Head-to-head turns',
  component: TurnDuel,
  args: { words: WORDS, languages: LANGUAGES, players: PLAYERS, scoringVersion: 2 },
};

export default meta;
type Story = StoryObj<typeof TurnDuel>;

/** Opens before turn 1; Play runs every turn, Next turn plays one. */
export const YouVsThiery: Story = { name: 'You vs Thiery (1366 – 17)' };

export const Phone: Story = {
  name: 'You vs Thiery on a phone',
  parameters: { viewport: { defaultViewport: 'phone' } },
};
