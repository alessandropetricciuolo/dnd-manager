import { useContext } from 'react';
import { useGmCampaignsContext, GmCampaignContextType } from '../contexts/GmCampaignContext';

/**
 * Hook to access and control the GM active campaign, session, and party characters.
 * Re-exports the context-based store to keep all GM screens seamlessly synchronized.
 */
export function useGmCampaigns(): GmCampaignContextType {
  return useGmCampaignsContext();
}

export default useGmCampaigns;
