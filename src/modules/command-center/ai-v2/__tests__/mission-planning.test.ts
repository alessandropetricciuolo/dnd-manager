import assert from "node:assert/strict";
import test from "node:test";
import { extractMissionProposalSelection, isLongCampaignContext, looksLikeMissionPackage, normalizeMissionProposals, validateMissionEvidenceIds } from "../mission-planning";

test("R3 riconosce solo campagne long per i pacchetti", () => {
  assert.equal(isLongCampaignContext("TIPO CAMPAGNA: long"), true);
  assert.equal(isLongCampaignContext("TIPO CAMPAGNA: quest"), false);
});
test("R3 limita il piano a cinque proposte e scarta righe senza titolo", () => {
  const proposals = normalizeMissionProposals(Array.from({ length: 7 }, (_, i) => ({ title: i === 6 ? "" : `Missione ${i}`, grade: "D" })));
  assert.equal(proposals.length, 5);
  assert.equal(proposals[0].id, "proposal-1");
});
test("R3 distingue una richiesta di pacchetto", () => {
  assert.equal(looksLikeMissionPackage("creami 3 missioni di grado D"), true);
  assert.equal(looksLikeMissionPackage("crea una wiki di un fabbro"), false);
});
test("R3 conserva selezioni successive e scarta evidence inventate", () => {
  const proposals = normalizeMissionProposals([{ id: "a", title: "A" }, { id: "b", title: "B" }, { id: "c", title: "C" }]);
  assert.deepEqual(extractMissionProposalSelection("sviluppa le proposte 1 e 3", proposals), ["a", "c"]);
  assert.deepEqual(validateMissionEvidenceIds(["E1", "E99"], new Set(["E1"])), ["E1"]);
});
