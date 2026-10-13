import { pushPayload, retryAt, ticketOutcome, type PushJob } from "./push";

export type PushReceiptJob = { id: number; token: string; user_id: string; ticket_id: string; sent_at: string };
export type PushPreferenceState = { enabled: boolean; whispers: boolean; sessions: boolean; notificationsDisabled: boolean };
export type PushJobUpdate = Record<string, unknown>;

export type PushDispatchDependencies = {
  listReceiptJobs(cutoff: string): Promise<PushReceiptJob[]>;
  fetchReceipts(ticketIds: string[]): Promise<Record<string, { status?: string; details?: { error?: string } }>>;
  claimJobs(limit: number): Promise<PushJob[]>;
  getPreferences(job: PushJob): Promise<PushPreferenceState>;
  isEligible(jobId: number): Promise<boolean>;
  send(payload: ReturnType<typeof pushPayload>): Promise<{ status?: string; id?: string; details?: { error?: string } } | undefined>;
  disableDevice(userId: string, token: string): Promise<void>;
  updateJob(id: number, patch: PushJobUpdate): Promise<void>;
};

export async function dispatchMobilePushes(deps: PushDispatchDependencies, now = Date.now()) {
  const receiptJobs = await deps.listReceiptJobs(new Date(now - 15 * 60000).toISOString());
  if (receiptJobs.length) {
    const receipts = await deps.fetchReceipts(receiptJobs.map((job) => job.ticket_id));
    for (const job of receiptJobs) {
      const receipt = receipts[job.ticket_id];
      if (!receipt) {
        if (Date.parse(job.sent_at) < now - 23 * 3600000) await deps.updateJob(job.id, { status: "failed", last_error: "ReceiptExpired" });
        continue;
      }
      const code = receipt.details?.error || null;
      if (code === "DeviceNotRegistered") await deps.disableDevice(job.user_id, job.token);
      await deps.updateJob(job.id, { status: receipt.status === "ok" ? "delivered" : "failed", last_error: code });
    }
  }

  const jobs = await deps.claimJobs(20);
  let accepted = 0;
  async function sendJob(job: PushJob) {
    const preferences = await deps.getPreferences(job);
    const categoryEnabled = job.kind === "whisper" ? preferences.whispers : preferences.sessions;
    if (!preferences.enabled || preferences.notificationsDisabled || !categoryEnabled) {
      await deps.updateJob(job.id, { status: "skipped", last_error: null });
      return;
    }
    if (!await deps.isEligible(job.id)) {
      await deps.updateJob(job.id, { status: "skipped", last_error: null });
      return;
    }

    let ticket;
    try { ticket = await deps.send(pushPayload(job)); } catch { ticket = undefined; }
    const outcome = ticketOutcome(ticket, job.attempts);
    if (outcome.last_error === "DeviceNotRegistered") await deps.disableDevice(job.user_id, job.token);
    await deps.updateJob(job.id, {
      ...outcome,
      sent_at: outcome.status === "ticket" ? new Date(now).toISOString() : null,
      available_at: retryAt(job.attempts, now),
    });
    if (outcome.status === "ticket") accepted++;
  }
  // Bound both provider concurrency and invocation duration. Unclaimed rows
  // remain pending for the next scheduled invocation.
  for (let offset = 0; offset < jobs.length; offset += 5) {
    await Promise.all(jobs.slice(offset, offset + 5).map(sendJob));
  }
  return { claimed: jobs.length, accepted };
}
