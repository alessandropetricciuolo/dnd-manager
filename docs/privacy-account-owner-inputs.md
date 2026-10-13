# Privacy and account owner inputs

The account request path currently records a request as `pending` for manual handling. It does not delete an Auth user or application data. There is no operator screen, notification, or automated processing in this change. Before describing deletion timing or outcomes to users, the owner must define and implement the handling procedure.

The operational workflow still needs an owner:

1. An authorized operator checks `account_deletion_requests` for `pending` rows and verifies the linked account through the existing account identity.
2. The operator changes the request to `in_progress` and updates `updated_at`, following a retention and campaign-data policy the owner has approved.
3. Once the approved handling is complete, the operator records the outcome as `completed` or `rejected`, updates `updated_at`, and fills `handled_at` and concise `handling_notes` where appropriate.
4. The owner defines and implements how the user is notified and how the result is checked. The current route sends no follow-up message and makes no claim about a processing deadline.

This note documents a required operational task, not evidence that the handling workflow is currently staffed, automated, or legally complete.

Owner decisions still required before expanding the privacy notice:

- Legal identity and contact details of the data controller.
- Which account, gameplay, communication, device, and diagnostic data are collected, and for what purposes and legal bases.
- Retention periods or criteria for each data category, including whispers, account deletion requests, and reports.
- How access, correction, export, objection, and deletion requests are verified, handled, and completed.
- Who reviews abuse reports, who can access them, and the retention policy for reports and blocks.
- Whether deleting an account affects campaign records, messages, backups, or other users' records, and how any exceptions are explained.
- The support contact and any response-time commitment the owner is prepared to meet.

Verified implementation references at the time this note was added:

- The website loads the Iubenda consent widget configured with cookie policy ID `43878034`.
- The linked Iubenda URL `https://www.iubenda.com/privacy-policy/43878034` returned HTTP 200 and a page titled “Privacy Policy di 4466894 | www.barberanddragons.com” when checked on 2026-10-13.
- The website has a `/contatti` form that replies to the submitter's email.
- The mobile deletion request is stored in `account_deletion_requests` for manual review; it does not execute deletion.
- Abuse reports are stored in `whisper_reports`; whisper blocks are stored per blocker in `whisper_user_blocks` and prevent new whisper inserts in either direction.
