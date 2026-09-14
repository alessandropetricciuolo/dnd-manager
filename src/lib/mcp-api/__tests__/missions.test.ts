import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, validate } from "../contracts";

const campaign_id = "11111111-1111-4111-8111-111111111111";
const mission_id = "22222222-2222-4222-8222-222222222222";

test("mission contracts cover native CRUD, encounters, and resource links", () => {
  assert.equal(validate({ operation: "search_missions", args: { campaign_id, status: "open", limit: 50 } }).operation, "search_missions");
  assert.equal(validate({ operation: "create_mission", args: { campaign_id, grade: "C", title: "La Cripta", committente: "Egida", ubicazione: "Portico", paga: "100 mo", urgenza: "3 giorni", description: "Indagare", points_reward: 2 } }).operation, "create_mission");
  assert.equal(validate({ operation: "replace_encounter_monsters", args: { campaign_id, encounter_id: mission_id, monsters: [{ wiki_entity_id: campaign_id, quantity: 2 }] } }).operation, "replace_encounter_monsters");
  assert.equal(validate({ operation: "link_mission_resource", args: { campaign_id, mission_id, resource_type: "scene", resource_id: campaign_id } }).operation, "link_mission_resource");
});

test("mission contracts reject stale-write omissions and invalid destructive payloads", () => {
  for (const raw of [
    { operation: "update_mission", args: { campaign_id, mission_id, title: "Nuovo" } },
    { operation: "set_mission_status", args: { campaign_id, mission_id, expected_updated_at: "now", status: "completed" } },
    { operation: "complete_mission", args: { campaign_id, mission_id, expected_updated_at: "now", treasure_gp: -1 } },
    { operation: "replace_encounter_monsters", args: { campaign_id, encounter_id: mission_id, monsters: [{ wiki_entity_id: campaign_id, quantity: 0 }] } },
  ]) assert.throws(() => validate(raw), ApiError);
});
