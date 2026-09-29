import React from 'react';
import { addons, types } from '@storybook/manager-api';
import { REPLAY_ADDON_ID, REPLAY_PANEL_ID, REPLAY_PARAM } from '../src/storybook/replayEvents';
import { ReplayPanel } from './ReplayPanel';

addons.register(REPLAY_ADDON_ID, () => {
  addons.add(REPLAY_PANEL_ID, {
    type: types.PANEL,
    title: 'Replay',
    paramKey: REPLAY_PARAM,
    disabled: (parameters) => !parameters?.[REPLAY_PARAM],
    render: ({ active }) => <ReplayPanel active={active} />,
  });
});
