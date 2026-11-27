import React from 'react';
import { GmRegiaScreen } from './GmRegiaScreen';

/**
 * Legacy route compatibility wrapper: Initiative is now unified into GmRegiaScreen.
 */
export const GmCombatTrackerScreen: React.FC = () => {
  return <GmRegiaScreen />;
};

export default GmCombatTrackerScreen;
