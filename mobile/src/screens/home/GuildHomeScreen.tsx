import React from 'react';
import { PlayerHomeScreen } from '../player/PlayerHomeScreen';

/**
 * GuildHomeScreen has been deprecated in favor of dedicated PlayerHomeScreen and GmHomeScreen.
 * Re-exporting PlayerHomeScreen ensures backward compatibility without any crash hazards.
 */
export const GuildHomeScreen: React.FC = () => {
  return <PlayerHomeScreen />;
};

export default GuildHomeScreen;
