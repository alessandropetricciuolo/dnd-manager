import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildWikiRelationshipRows,
  replaceWikiRelationships,
} from "@/lib/wiki/wiki-relationship-sync";

type QueryResult = { data?: unknown; error?: { message?: string } | null };

function thenable(result: QueryResult) {
  return {
    select() {
      return this;
    },
    delete() {
      return this;
    },
    eq() {
      return this;
    },
    then(resolve: (value: QueryResult) => void, reject: (reason?: unknown) => void) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
}

test("buildWikiRelationshipRows normalizza mappe e scarta self-link wiki", () => {
  const rows = buildWikiRelationshipRows("campaign", "source", [
    { targetType: "wiki", targetId: "source", label: "Self" },
    { targetType: "wiki", targetId: "target", label: "" },
    { targetType: "map", targetId: "map", label: "Luogo" },
  ]);

  assert.deepEqual(rows, [
    {
      campaign_id: "campaign",
      source_id: "source",
      target_id: "target",
      target_map_id: null,
      label: "—",
    },
    {
      campaign_id: "campaign",
      source_id: "source",
      target_id: null,
      target_map_id: "map",
      label: "Luogo",
    },
  ]);
});

test("replaceWikiRelationships ripristina le relazioni precedenti se l'inserimento fallisce", async () => {
  const previous = [{ target_id: "old-target", target_map_id: null, label: "Vecchia" }];
  const insertedRows: unknown[] = [];

  const supabase = {
    from() {
      return {
        select() {
          return thenable({ data: previous, error: null });
        },
        delete() {
          return thenable({ error: null });
        },
        insert(rows: unknown) {
          insertedRows.push(rows);
          return thenable(
            insertedRows.length === 1
              ? { error: { message: "foreign key violation" } }
              : { error: null }
          );
        },
      };
    },
  } as unknown as SupabaseClient;

  const result = await replaceWikiRelationships(supabase, "campaign", "source", [
    { targetType: "wiki", targetId: "new-target", label: "Nuova" },
  ]);

  assert.equal(result.success, false);
  assert.match(result.error, /foreign key violation/);
  assert.deepEqual(insertedRows, [
    [
      {
        campaign_id: "campaign",
        source_id: "source",
        target_id: "new-target",
        target_map_id: null,
        label: "Nuova",
      },
    ],
    [
      {
        campaign_id: "campaign",
        source_id: "source",
        target_id: "old-target",
        target_map_id: null,
        label: "Vecchia",
      },
    ],
  ]);
});
