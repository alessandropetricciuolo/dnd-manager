export const entityKinds = ["campaign", "npc", "location", "faction", "quest", "item", "event", "session", "lore", "player_character", "monster"] as const;
export const statuses = ["draft", "proposed", "canonical", "deprecated"] as const;
export const operations = ["search_lore", "get_entity", "search_maps", "get_map", "create_lore", "create_npc", "create_location", "update_entity", "upload_asset", "attach_asset", "upload_entity_image", "upload_map", "set_status"] as const;
export type Operation = typeof operations[number];

export interface EntityEnvelope {
  schema_version: 1;
  id: string;
  campaign_id: string;
  kind: typeof entityKinds[number];
  name: string;
  body: string;
  attributes: Record<string, unknown>;
  admin_only: boolean;
  status: typeof statuses[number];
  revision: number;
  image_url: string | null;
  source: { domain: "wiki"; id: string };
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields: Record<Operation, string[]> = {
  search_lore: ["query", "limit", "offset", "admin_only"],
  get_entity: ["entity_id", "admin_only"],
  search_maps: ["query", "map_type", "limit", "offset", "admin_only"],
  get_map: ["map_id", "admin_only"],
  create_lore: ["name", "body", "attributes", "admin_only"],
  create_npc: ["name", "body", "attributes", "admin_only"],
  create_location: ["name", "body", "attributes", "admin_only"],
  update_entity: ["entity_id", "revision", "name", "body", "attributes", "admin_only"],
  upload_asset: ["filename", "mime_type", "data_base64"],
  attach_asset: ["entity_id", "asset_id"],
  upload_entity_image: ["entity_id", "revision", "filename", "mime_type", "data_base64"],
  upload_map: ["name", "description", "map_type", "visibility", "parent_map_id", "admin_only", "image_url", "filename", "mime_type", "data_base64"],
  set_status: ["entity_id", "revision", "status"],
};

export function validate(raw: unknown): { operation: Operation; args: Record<string, any> } {
  const fail = (): never => { throw new ApiError(400, "Invalid input"); };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail();
  const r = raw as Record<string, any>;
  if (Object.keys(r).some((key) => !["operation", "args"].includes(key)) || !operations.includes(r.operation)) return fail();
  const args = r.args;
  if (!args || typeof args !== "object" || Array.isArray(args) || typeof args.campaign_id !== "string" || !uuid.test(args.campaign_id)) return fail();
  const operation = r.operation as Operation;
  if (Object.keys(args).some((key) => key !== "campaign_id" && !fields[operation].includes(key))) return fail();
  for (const key of ["entity_id", "asset_id", "map_id"]) if (fields[operation].includes(key) && (typeof args[key] !== "string" || !uuid.test(args[key]))) return fail();
  if (["update_entity", "upload_entity_image", "set_status"].includes(operation) && (!Number.isSafeInteger(args.revision) || args.revision < 1)) return fail();
  if (operation.startsWith("create_") && (args.name === undefined || args.body === undefined)) return fail();
  for (const [key, max] of [["name", 200], ["body", 100000], ["query", 200]] as const) {
    if (args[key] !== undefined && (typeof args[key] !== "string" || args[key].length > max || (key !== "body" && !args[key].trim()))) return fail();
  }
  for (const key of ["admin_only"]) if (args[key] !== undefined && typeof args[key] !== "boolean") return fail();
  if (args.attributes !== undefined && (!args.attributes || typeof args.attributes !== "object" || Array.isArray(args.attributes) || JSON.stringify(args.attributes).length > 20000)) return fail();
  if (operation === "update_entity" && !["name", "body", "attributes", "admin_only"].some((key) => args[key] !== undefined)) return fail();
  if (operation === "set_status" && !statuses.includes(args.status)) return fail();
  if (operation === "search_lore") {
    if (args.query === undefined) return fail();
    if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 50)) return fail();
    if (args.offset !== undefined && (!Number.isInteger(args.offset) || args.offset < 0 || args.offset > 10000)) return fail();
  }
  if (operation === "search_maps") {
    if (args.query !== undefined && (typeof args.query !== "string" || !args.query.trim() || args.query.length > 200)) return fail();
    if (args.map_type !== undefined && !["world", "continent", "city", "dungeon", "district", "building"].includes(args.map_type)) return fail();
    if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100)) return fail();
    if (args.offset !== undefined && (!Number.isInteger(args.offset) || args.offset < 0 || args.offset > 10000)) return fail();
  }
  if (operation === "upload_asset") {
    if (typeof args.filename !== "string" || !/^[\w .-]+$/.test(args.filename) || args.filename.includes("..")) return fail();
    if (!(["image/png", "image/jpeg", "image/webp", "application/pdf"] as string[]).includes(args.mime_type)) return fail();
    if (typeof args.data_base64 !== "string" || args.data_base64.length > 699052 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(args.data_base64)) return fail();
    const bytes = Buffer.from(args.data_base64, "base64");
    if (!bytes.length || bytes.length > 524288 || bytes.toString("base64") !== args.data_base64) return fail();
    const validSignature = args.mime_type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) :
      args.mime_type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
      args.mime_type === "image/webp" ? bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" : bytes.toString("ascii", 0, 5) === "%PDF-";
    if (!validSignature) return fail();
  }
  if (operation === "upload_entity_image") {
    if (typeof args.filename !== "string" || args.filename.length > 120 || !/^[\w .-]+$/.test(args.filename) || args.filename.includes("..")) return fail();
    if (!["image/png", "image/jpeg", "image/webp"].includes(args.mime_type)) return fail();
    if (typeof args.data_base64 !== "string" || args.data_base64.length > 4194304 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(args.data_base64)) return fail();
    const bytes = Buffer.from(args.data_base64, "base64");
    const validSignature = args.mime_type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) :
      args.mime_type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
      bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!bytes.length || bytes.length > 3145728 || bytes.toString("base64") !== args.data_base64 || !validSignature) return fail();
  }
  if (operation === "upload_map") {
    if (typeof args.name !== "string" || !args.name.trim() || args.name.length > 200) return fail();
    if (args.description !== undefined && (typeof args.description !== "string" || args.description.length > 10000)) return fail();
    if (args.map_type !== undefined && !["world", "continent", "city", "dungeon", "district", "building"].includes(args.map_type)) return fail();
    if (args.visibility !== undefined && !["secret", "public"].includes(args.visibility)) return fail();
    if (args.admin_only !== undefined && typeof args.admin_only !== "boolean") return fail();
    if (args.parent_map_id !== undefined && (typeof args.parent_map_id !== "string" || !uuid.test(args.parent_map_id))) return fail();
    const hasUrl = typeof args.image_url === "string" && !!args.image_url.trim();
    const hasUpload = args.data_base64 !== undefined || args.filename !== undefined || args.mime_type !== undefined;
    if (hasUrl === hasUpload) return fail();
    if (hasUrl) {
      try {
        const url = new URL(args.image_url);
        if (url.protocol !== "https:" || url.username || url.password) return fail();
      } catch { return fail(); }
    } else {
      if (typeof args.filename !== "string" || args.filename.length > 120 || !/^[\w .-]+$/.test(args.filename) || args.filename.includes("..")) return fail();
      if (!["image/png", "image/jpeg", "image/webp"].includes(args.mime_type)) return fail();
      if (typeof args.data_base64 !== "string" || args.data_base64.length > 4194304 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(args.data_base64)) return fail();
      const bytes = Buffer.from(args.data_base64, "base64");
      const validSignature = args.mime_type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) :
        args.mime_type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
        bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
      if (!bytes.length || bytes.length > 3145728 || bytes.toString("base64") !== args.data_base64 || !validSignature) return fail();
    }
  }
  return { operation, args };
}
