import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampRoomCount,
  createSeededRandom,
  generateRandomDungeon,
  parseDungeonSeed,
  recommendedDungeonGrid,
} from "../scene-editor/random-dungeon";
import {
  DOOR_WALL_ID_PREFIX,
  generateWallsFromAreas,
  isPersistentDoorWall,
} from "../scene-editor/auto-walls";
import { rectangleAreaPolygon, type SceneAreaV1 } from "../scene-schema";

/** RNG deterministico (mulberry32) per test riproducibili. */
function seededRandom(seed: number): () => number {
  return createSeededRandom(seed);
}

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

function polygonBounds(polygon: Array<{ x: number; y: number }>): Bounds {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

/** Tutte le aree (stanze + corridoi) devono formare un unico blocco connesso. */
function isConnected(areas: SceneAreaV1[]): boolean {
  if (areas.length === 0) return false;
  const bounds = areas.map((a) => polygonBounds(a.polygon));
  const visited = new Set<number>([0]);
  const queue = [0];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (let i = 0; i < bounds.length; i++) {
      if (visited.has(i)) continue;
      if (boundsIntersect(bounds[cur], bounds[i])) {
        visited.add(i);
        queue.push(i);
      }
    }
  }
  return visited.size === areas.length;
}

describe("generateRandomDungeon", () => {
  const CELL = 100;

  it("places the requested number of rooms and connects them", () => {
    for (const seed of [1, 7, 42, 1234]) {
      for (const roomCount of [2, 5, 9]) {
        const grid = recommendedDungeonGrid(roomCount);
        const result = generateRandomDungeon({
          roomCount,
          cols: grid.cols + 8,
          rows: grid.rows + 6,
          cellPx: CELL,
          random: seededRandom(seed),
        });
        assert.equal(result.roomsPlaced, roomCount, `seed=${seed} rooms=${roomCount}`);
        const rooms = result.areas.filter((a) => a.kind === "room");
        const corridors = result.areas.filter((a) => a.kind === "corridor");
        assert.equal(rooms.length, roomCount);
        assert.ok(corridors.length >= roomCount - 1, "servono corridoi per collegare le stanze");
        assert.ok(isConnected(result.areas), `dungeon non connesso (seed=${seed})`);
      }
    }
  });

  it("aligns every vertex to the grid", () => {
    const grid = recommendedDungeonGrid(6);
    const result = generateRandomDungeon({
      roomCount: 6,
      cols: grid.cols,
      rows: grid.rows,
      cellPx: CELL,
      random: seededRandom(99),
    });
    for (const area of result.areas) {
      for (const p of area.polygon) {
        assert.equal(p.x % CELL, 0);
        assert.equal(p.y % CELL, 0);
      }
    }
  });

  it("creates persistent door walls on room edges", () => {
    const grid = recommendedDungeonGrid(6);
    const result = generateRandomDungeon({
      roomCount: 6,
      cols: grid.cols,
      rows: grid.rows,
      cellPx: CELL,
      random: seededRandom(3),
    });
    assert.ok(result.doorWalls.length >= 1, "attese porte agli ingressi");
    const roomBounds = result.areas
      .filter((a) => a.kind === "room")
      .map((a) => polygonBounds(a.polygon));
    for (const wall of result.doorWalls) {
      assert.ok(wall.id.startsWith(DOOR_WALL_ID_PREFIX));
      assert.ok(wall.door && wall.door.width > 0);
      assert.ok(isPersistentDoorWall(wall));
      const onRoomEdge = roomBounds.some(
        (b) =>
          (wall.x1 === wall.x2 && (wall.x1 === b.minX || wall.x1 === b.maxX)) ||
          (wall.y1 === wall.y2 && (wall.y1 === b.minY || wall.y1 === b.maxY))
      );
      assert.ok(onRoomEdge, "la porta deve giacere sul bordo di una stanza");
    }
  });

  it("places props inside rooms and stairs in the first room (dungeon theme)", () => {
    const grid = recommendedDungeonGrid(5);
    const result = generateRandomDungeon({
      roomCount: 5,
      cols: grid.cols,
      rows: grid.rows,
      cellPx: CELL,
      random: seededRandom(11),
    });
    assert.ok(result.props.length >= 1);
    assert.ok(result.props.some((p) => p.kind === "stairs"));
    const roomBounds = result.areas
      .filter((a) => a.kind === "room")
      .map((a) => polygonBounds(a.polygon));
    for (const prop of result.props) {
      const inside = roomBounds.some(
        (b) => prop.x > b.minX && prop.x < b.maxX && prop.y > b.minY && prop.y < b.maxY
      );
      assert.ok(inside, `prop ${prop.kind} fuori dalle stanze`);
    }
  });

  it("respects withDoors/withProps flags", () => {
    const grid = recommendedDungeonGrid(4);
    const result = generateRandomDungeon({
      roomCount: 4,
      cols: grid.cols,
      rows: grid.rows,
      cellPx: CELL,
      withDoors: false,
      withProps: false,
      random: seededRandom(5),
    });
    assert.equal(result.doorWalls.length, 0);
    assert.equal(result.props.length, 0);
  });

  it("clamps the room count", () => {
    assert.equal(clampRoomCount(0), 2);
    assert.equal(clampRoomCount(100), 14);
    assert.equal(clampRoomCount(Number.NaN), 2);
  });

  it("produces identical layouts for the same numeric seed", () => {
    const grid = recommendedDungeonGrid(5);
    const opts = {
      roomCount: 5,
      cols: grid.cols,
      rows: grid.rows,
      cellPx: CELL,
      seed: 424242,
    };
    const a = generateRandomDungeon(opts);
    const b = generateRandomDungeon(opts);
    assert.equal(a.roomsPlaced, b.roomsPlaced);
    assert.equal(a.areas.length, b.areas.length);
    assert.deepEqual(
      a.areas.map((area) => area.polygon),
      b.areas.map((area) => area.polygon)
    );
    assert.equal(a.seedUsed, 424242);
  });

  it("hashes string seeds deterministically", () => {
    const grid = recommendedDungeonGrid(4);
    const base = {
      roomCount: 4,
      cols: grid.cols,
      rows: grid.rows,
      cellPx: CELL,
    };
    const a = generateRandomDungeon({ ...base, seed: "taverna-segreta" });
    const b = generateRandomDungeon({ ...base, seed: "taverna-segreta" });
    assert.deepEqual(
      a.areas.map((area) => area.polygon),
      b.areas.map((area) => area.polygon)
    );
    assert.equal(a.seedUsed, parseDungeonSeed("taverna-segreta"));
  });

  it("labels rooms from roomLabelStart when appending", () => {
    const grid = recommendedDungeonGrid(3);
    const result = generateRandomDungeon({
      roomCount: 3,
      cols: grid.cols,
      rows: grid.rows,
      cellPx: CELL,
      random: seededRandom(77),
      roomLabelStart: 4,
    });
    const labels = result.areas.filter((a) => a.kind === "room").map((a) => a.label);
    assert.deepEqual(labels, ["Stanza 4", "Stanza 5", "Stanza 6"]);
  });

  it("uses larger rooms for large size profile", () => {
    const grid = recommendedDungeonGrid(4, "large");
    const small = generateRandomDungeon({
      roomCount: 4,
      cols: grid.cols,
      rows: grid.rows,
      cellPx: CELL,
      roomSize: "small",
      random: seededRandom(8),
    });
    const large = generateRandomDungeon({
      roomCount: 4,
      cols: grid.cols,
      rows: grid.rows,
      cellPx: CELL,
      roomSize: "large",
      random: seededRandom(8),
    });
    const avgArea = (areas: typeof small.areas) => {
      const rooms = areas.filter((a) => a.kind === "room");
      return (
        rooms.reduce((sum, room) => {
          const b = polygonBounds(room.polygon);
          return sum + (b.maxX - b.minX) * (b.maxY - b.minY);
        }, 0) / rooms.length
      );
    };
    assert.ok(avgArea(large.areas) > avgArea(small.areas));
  });

  it("uses theme-specific first-room props", () => {
    const grid = recommendedDungeonGrid(4);
    const taverna = generateRandomDungeon({
      roomCount: 4,
      cols: grid.cols,
      rows: grid.rows,
      cellPx: CELL,
      propTheme: "taverna",
      random: seededRandom(21),
    });
    const caverna = generateRandomDungeon({
      roomCount: 4,
      cols: grid.cols,
      rows: grid.rows,
      cellPx: CELL,
      propTheme: "caverna",
      random: seededRandom(21),
    });
    assert.ok(taverna.props.some((p) => p.kind === "table"));
    assert.ok(caverna.props.some((p) => p.kind === "stairs"));
    const tavernaKinds = new Set(taverna.props.map((p) => p.kind));
    assert.ok(!tavernaKinds.has("boulder"));
  });
});

describe("generateWallsFromAreas with persistent door walls", () => {
  it("keeps door walls not on the union boundary across regenerations", () => {
    const room: SceneAreaV1 = {
      id: "r1",
      kind: "room",
      polygon: rectangleAreaPolygon(100, 100, 300, 300),
    };
    const corridor: SceneAreaV1 = {
      id: "c1",
      kind: "corridor",
      polygon: rectangleAreaPolygon(250, 400, 100, 300),
    };
    const doorWall = {
      id: `${DOOR_WALL_ID_PREFIX}test`,
      x1: 250,
      y1: 400,
      x2: 350,
      y2: 400,
      door: { width: 70, offset: 0.5 },
    };
    const walls = generateWallsFromAreas([room, corridor], [doorWall]);
    const kept = walls.find((w) => w.id === doorWall.id);
    assert.ok(kept, "il muro-porta deve sopravvivere alla rigenerazione");
    assert.deepEqual(kept?.door, doorWall.door);

    // Seconda rigenerazione (es. altra modifica del layer): ancora presente.
    const wallsAgain = generateWallsFromAreas([room, corridor], walls);
    assert.ok(wallsAgain.some((w) => w.id === doorWall.id));

    // Un muro qualsiasi fuori perimetro senza prefisso viene scartato.
    const wallsWithStray = generateWallsFromAreas(
      [room, corridor],
      [...walls, { id: "stray", x1: 0, y1: 0, x2: 50, y2: 0 }]
    );
    assert.ok(!wallsWithStray.some((w) => w.id === "stray"));
  });
});
