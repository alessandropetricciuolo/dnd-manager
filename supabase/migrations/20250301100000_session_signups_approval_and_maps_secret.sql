-- Session signups: approval flow (pending -> approved -> attended, or rejected)
ALTER TABLE session_signups
  DROP CONSTRAINT IF EXISTS session_signups_status_check;

ALTER TABLE session_signups
  ADD CONSTRAINT session_signups_status_check
  CHECK (status IN ('pending', 'approved', 'attended', 'rejected', 'confirmed', 'waitlist', 'cancelled'));

-- Optional: migrate existing data to new statuses (confirmed -> approved, waitlist -> pending, cancelled -> rejected)
UPDATE session_signups SET status = 'approved' WHERE status = 'confirmed';
UPDATE session_signups SET status = 'pending' WHERE status = 'waitlist';
UPDATE session_signups SET status = 'rejected' WHERE status = 'cancelled';

-- Now restrict to new set only (optional - uncomment to enforce only new statuses)
-- ALTER TABLE session_signups DROP CONSTRAINT session_signups_status_check;
-- ALTER TABLE session_signups ADD CONSTRAINT session_signups_status_check
--   CHECK (status IN ('pending', 'approved', 'attended', 'rejected'));

-- Maps: fog of war (secret maps unlockable by GM)
ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS is_secret BOOLEAN NOT NULL DEFAULT false;
