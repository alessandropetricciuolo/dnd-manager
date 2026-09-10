import { canReadAdminContent, type AdminContentAccess } from "./access";

export type AdminOnlyPredicate =
  | { column: "admin_only"; value: false }
  | null;

/**
 * A privileged query remains non-Admin unless its scope came from verified
 * server-side Auth + profiles.role resolution.
 */
export function adminOnlyPredicate(access: AdminContentAccess): AdminOnlyPredicate {
  return canReadAdminContent(access)
    ? null
    : { column: "admin_only", value: false };
}

export type AdminOnlyFilterQuery<TQuery> = {
  eq(column: "admin_only", value: false): TQuery;
};

export function applyAdminContentScope<TQuery extends AdminOnlyFilterQuery<TQuery>>(
  query: TQuery,
  access: AdminContentAccess
): TQuery {
  const predicate = adminOnlyPredicate(access);
  if (!predicate) return query;
  return query.eq(predicate.column, predicate.value);
}

