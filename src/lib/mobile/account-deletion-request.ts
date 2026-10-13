export interface AccountDeletionRequestLike {
  headers: { get(name: string): string | null };
}

export interface AccountDeletionDependencies {
  authenticate(accessToken: string): Promise<{ userId: string | null }>;
  createRequest(userId: string): Promise<{ error?: { code?: string } | null }>;
}

export interface AccountDeletionResponse {
  status: 202 | 401 | 503;
  body: { status: "received" } | { error: string };
}

export async function handleAccountDeletionRequest(
  request: AccountDeletionRequestLike,
  dependencies: AccountDeletionDependencies,
): Promise<AccountDeletionResponse> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  if (!match) return { status: 401, body: { error: "Autenticazione richiesta." } };

  let userId: string | null;
  try {
    ({ userId } = await dependencies.authenticate(match[1]));
  } catch {
    return { status: 401, body: { error: "Sessione non valida." } };
  }
  if (!userId) return { status: 401, body: { error: "Sessione non valida." } };

  try {
    const { error } = await dependencies.createRequest(userId);
    // A prior open request already represents the authenticated user's request.
    if (error && error.code !== "23505") {
      return { status: 503, body: { error: "Non è stato possibile registrare la richiesta." } };
    }
    return { status: 202, body: { status: "received" } };
  } catch {
    return { status: 503, body: { error: "Servizio temporaneamente non disponibile." } };
  }
}
