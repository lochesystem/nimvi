import type { NimviGenome, NimviMetrics, NimviSave, PixelFrame } from "./types";

export const GRID_SIZE = 32;
export const SAVE_KEY = "nimvi.save.v1";

export const PALETTES = [
  { name: "Pêssego lunar", body: "#f28f79", light: "#ffd1a8", shadow: "#c95a63", outline: "#281d35", eyes: "#183b46", accent: "#67c6aa" },
  { name: "Índigo elétrico", body: "#34338f", light: "#42d9dd", shadow: "#20215f", outline: "#15132c", eyes: "#fff08a", accent: "#69f0d0" },
  { name: "Musgo doce", body: "#6faf65", light: "#c8df8c", shadow: "#3c755e", outline: "#203238", eyes: "#202533", accent: "#f2b86b" },
  { name: "Ameixa solar", body: "#9a4d86", light: "#f08fa1", shadow: "#62365f", outline: "#241c35", eyes: "#ffe49a", accent: "#ffbf47" },
  { name: "Gelo coral", body: "#65b9c5", light: "#d8f1e8", shadow: "#47739b", outline: "#26344e", eyes: "#29334a", accent: "#ff7c74" },
  { name: "Caramelo cósmico", body: "#b77745", light: "#f1c575", shadow: "#75434b", outline: "#302037", eyes: "#282235", accent: "#8de0c1" },
  { name: "Pitaya fantasma", body: "#df6296", light: "#ffb6c7", shadow: "#98476f", outline: "#35203e", eyes: "#29213d", accent: "#8fe3c2" },
  { name: "Tempestade", body: "#536a83", light: "#9ebac1", shadow: "#37445f", outline: "#202333", eyes: "#f7e8a4", accent: "#a68cff" },
] as const;

const FIRST = ["Ni", "Mu", "Ve", "Lo", "Pi", "Tu", "Za", "Mi", "No", "Ki", "Lu", "E"];
const LAST = ["mi", "vi", "lo", "ru", "pa", "ni", "mo", "li", "zu", "ki", "va", "bu"];

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeSeed(seed: string): string {
  return seed.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export function createSeed(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return `N2${Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .toUpperCase()}`
    .slice(0, 12);
}

export function generateGenome(inputSeed: string): NimviGenome {
  const seed = normalizeSeed(inputSeed) || "NIMVI0000001";
  const random = mulberry32(hashSeed(seed));
  const pick = (length: number) => Math.floor(random() * length);
  const first = FIRST[pick(FIRST.length)];
  let last = LAST[pick(LAST.length)];
  if (first.toLowerCase().endsWith(last[0])) last = last.slice(1);

  return {
    seed,
    name: `${first}${last}`,
    model: hashSeed(`${seed}:model`) % (seed.startsWith("N2") ? 23 : 13),
    body: pick(6),
    palette: pick(PALETTES.length),
    eyes: pick(7),
    mouth: pick(5),
    crown: pick(8),
    marking: pick(10),
    tail: pick(7),
    quirk: pick(8),
    asymmetry: pick(3) - 1,
  };
}

export function createFreshSave(seed = createSeed()): NimviSave {
  const now = Date.now();
  return {
    version: 1,
    seed,
    bornAt: now,
    lastSeenAt: now,
    bond: 1,
    metrics: {
      visits: 1,
      interactions: 0,
      focusReturns: 0,
      hiddenSeconds: 0,
      resizes: 0,
      nightVisits: new Date(now).getHours() >= 20 || new Date(now).getHours() < 6 ? 1 : 0,
    },
  };
}

export function parseSave(raw: string | null): NimviSave | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<NimviSave>;
    if (value.version !== 1 || typeof value.seed !== "string" || !value.metrics) return null;
    return {
      version: 1,
      seed: normalizeSeed(value.seed),
      bornAt: Number(value.bornAt) || Date.now(),
      lastSeenAt: Number(value.lastSeenAt) || Date.now(),
      bond: Math.max(0, Math.min(100, Number(value.bond) || 0)),
      metrics: {
        visits: Math.max(1, Number(value.metrics.visits) || 1),
        interactions: Math.max(0, Number(value.metrics.interactions) || 0),
        focusReturns: Math.max(0, Number(value.metrics.focusReturns) || 0),
        hiddenSeconds: Math.max(0, Number(value.metrics.hiddenSeconds) || 0),
        resizes: Math.max(0, Number(value.metrics.resizes) || 0),
        nightVisits: Math.max(0, Number(value.metrics.nightVisits) || 0),
      },
    };
  } catch {
    return null;
  }
}

export function getStage(save: NimviSave): 1 | 2 | 3 {
  const activity = save.metrics.interactions + save.metrics.visits * 2 + save.metrics.focusReturns;
  if (activity >= 36) return 3;
  if (activity >= 12) return 2;
  return 1;
}

export function getTrait(metrics: NimviMetrics): { name: string; description: string } {
  const values = [
    { score: metrics.hiddenSeconds / 90, name: "Sonhador", description: "Coleciona sonhos quando a aba fica quieta." },
    { score: metrics.focusReturns * 2, name: "Saudoso", description: "Percebe cada vez que você retorna." },
    { score: metrics.interactions * 1.5, name: "Carinhoso", description: "Responde rápido a pequenos gestos." },
    { score: metrics.resizes * 4, name: "Elástico", description: "Aprendeu a não temer janelas apertadas." },
    { score: metrics.nightVisits * 5, name: "Noturno", description: "Brilha um pouco mais depois do pôr do sol." },
  ];
  return values.sort((a, b) => b.score - a.score)[0];
}

export function rarityLabel(genome: NimviGenome): string {
  const value = 100_000 + (hashSeed(genome.seed) % 8_900_000);
  return `1 em ${new Intl.NumberFormat("pt-BR").format(value)}`;
}

const makeFrame = (): PixelFrame =>
  Array.from({ length: GRID_SIZE }, () => Array<string | null>(GRID_SIZE).fill(null));

type Point = [number, number];
type PixelSet = Set<string>;

type CreatureLayout = {
  main: PixelSet;
  secondary: PixelSet;
  secondaryDetails: PixelSet;
  face: PixelSet;
  lightDetails: PixelSet;
  shadowDetails: PixelSet;
  eyes: [Point, Point];
  mouth: Point;
  mark: Point;
  baseline: number;
  artDirected: boolean;
};

const pointKey = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;
const addPoint = (set: PixelSet, x: number, y: number) => {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px >= 0 && px < GRID_SIZE && py >= 0 && py < GRID_SIZE) set.add(pointKey(px, py));
};

function addRect(set: PixelSet, x: number, y: number, width: number, height: number) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) addPoint(set, px, py);
  }
}

function addEllipse(set: PixelSet, cx: number, cy: number, rx: number, ry: number) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const nx = (x - cx) / (rx + 0.28);
      const ny = (y - cy) / (ry + 0.28);
      if (nx * nx + ny * ny <= 1) addPoint(set, x, y);
    }
  }
}

function addLine(set: PixelSet, from: Point, to: Point, thickness = 1) {
  let [x0, y0] = from.map(Math.round) as Point;
  const [x1, y1] = to.map(Math.round) as Point;
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  while (true) {
    for (let oy = 0; oy < thickness; oy += 1) for (let ox = 0; ox < thickness; ox += 1) addPoint(set, x0 + ox, y0 + oy);
    if (x0 === x1 && y0 === y1) break;
    const doubled = error * 2;
    if (doubled >= dy) { error += dy; x0 += sx; }
    if (doubled <= dx) { error += dx; y0 += sy; }
  }
}

function addPolygon(set: PixelSet, points: Point[]) {
  const minX = Math.floor(Math.min(...points.map(([x]) => x)));
  const maxX = Math.ceil(Math.max(...points.map(([x]) => x)));
  const minY = Math.floor(Math.min(...points.map(([, y]) => y)));
  const maxY = Math.ceil(Math.max(...points.map(([, y]) => y)));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1) + xi;
        if (intersects) inside = !inside;
      }
      if (inside) addPoint(set, x, y);
    }
  }
}

function baseLayout(): CreatureLayout {
  return {
    main: new Set(),
    secondary: new Set(),
    secondaryDetails: new Set(),
    face: new Set(),
    lightDetails: new Set(),
    shadowDetails: new Set(),
    eyes: [[13, 18], [19, 18]],
    mouth: [16, 22],
    mark: [21, 20],
    baseline: 29,
    artDirected: false,
  };
}

function layoutFromTemplate(
  rows: string[],
  eyes: [Point, Point],
  mouth: Point,
  mark: Point,
  xOffset: number,
  yOffset: number,
): CreatureLayout {
  const layout = baseLayout();
  layout.artDirected = true;
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    const px = x + xOffset;
    const py = y + yOffset;
    if (cell === "M") addPoint(layout.main, px, py);
    if (cell === "F") { addPoint(layout.main, px, py); addPoint(layout.face, px, py); }
    if (cell === "L") { addPoint(layout.main, px, py); addPoint(layout.lightDetails, px, py); }
    if (cell === "S") { addPoint(layout.main, px, py); addPoint(layout.shadowDetails, px, py); }
    if (cell === "A") addPoint(layout.secondary, px, py);
    if (cell === "D") { addPoint(layout.secondary, px, py); addPoint(layout.secondaryDetails, px, py); }
  }));
  layout.eyes = [[eyes[0][0] + xOffset, eyes[0][1] + yOffset], [eyes[1][0] + xOffset, eyes[1][1] + yOffset]];
  layout.mouth = [mouth[0] + xOffset, mouth[1] + yOffset];
  layout.mark = [mark[0] + xOffset, mark[1] + yOffset];
  layout.baseline = yOffset + rows.length;
  return layout;
}

const SIGNATURE_VERDANT = [
  "   AAA          AAAA",
  "  AADAA        AADAA",
  " AADDDA       AADDDA",
  " AADDDA      AADDDA ",
  "  AADAA     AADDDA  ",
  "   AAA       AADAA   ",
  "    AA       AAA     ",
  "     MMMMMMMMM       ",
  "   MMMMMMMMMMMMM     ",
  "  MMMMLLLLMMMMMMM    ",
  " MMMFFFFFFFFMMMMMM   ",
  "MMMFFFFFFFFFMMMMMMM  ",
  "MMMFFFFFFFFFMMMMMMMM ",
  "MMFFFFFFFFFFFMMMMMMMM",
  "MMFFFFFFFFFFFMMMMMMM ",
  "MMMFFFFFFFFFMMMMMMMM ",
  " MMMFFFFFFFFMMMMMMM  ",
  "  MMMFFFFFFMMMMMMM   ",
  "  SSMMMMMMMMMMMSS    ",
  "  SSSMMMMMMMMMSSS    ",
  "   MMM       MMM      ",
  "  MMMM       MMMM     ",
];

const SIGNATURE_ASTRAL = [
  "    AAA              D  ",
  "   AAAAA            DDD ",
  "   AALAA             D  ",
  "    AAA              M  ",
  "     A              MM  ",
  "     A             MM   ",
  "     M            MM    ",
  "     MM     LAA  MM     ",
  "    MMMM   LLAAA MM     ",
  "   MMMMMMLLAAAMMMMM     ",
  "  MMMMMMLLAMMMMMMMMM    ",
  " MMMMMMMMMMMMMMMMMMMM   ",
  "MMMMMMMMMMMMMMMMMMMMMM  ",
  "MMMMMMMMMMMMMMMMMMMMMMM ",
  "MMMMMMMMMMMMMMMMMMMMMM  ",
  "MMMMMMMMMMMMMMMMMMMMMMM ",
  "SMMMMMMMMMMMMMMMMMMM    ",
  "SSMMMMMMMMMMMMMMMMMM    ",
  " SSSMMMMMMMMMMMMMMM      ",
  "  MMMMMMMMMMMMMMMMMMM   ",
  "   MMMM       MMMM      ",
  "   MMMM       MMMM      ",
];

const SIGNATURE_EMBER = [
  "       A       A        ",
  "      AAA     AAA       ",
  "     AADAA   AADAA      ",
  "     AADAA  AAADAA      ",
  "      AAA   AAAAA       ",
  "       A     AAA        ",
  "       MM   MMM         ",
  "     MMMMMMMMMMM        ",
  "   MMMMMMMMMMMMMMM      ",
  "  MMMMLLLLMMMMMMMMM     ",
  " MMMFFFFFFFFFMMMMMMMM   ",
  "MMMFFFFFFFFFFFMMMMMMMM  ",
  "MMMFFFFFFFFFFFMMMMMMMMM ",
  "MMFFFFFFFFFFFFFMMMMMMMM ",
  "MMFFFFFFFFFFFFMMMMMMMMM ",
  "MMMFFFFFFFFFFMMMMMMMMMM ",
  " MMMFFFFFFFFMMMMMMMMMM  ",
  "  MMMFFFFFFMMMMMMMMMM   ",
  "  SSMMMMMMMMMMMMMSS     ",
  "  SSSMMMMMMMMMMMSSS     ",
  "   MMM        MMMM      ",
  "  MMMM        MMMM      ",
];

const SIGNATURE_TIDE = [
  "        AA              ",
  "       AAAA             ",
  "      AALAAA            ",
  "       AAAA             ",
  "        AA              ",
  "       MMMM             ",
  "      MMMMMM            ",
  "    MMMMMMMMMMMM        ",
  "   MMMMMMMMMMMMMMM      ",
  " AAMMMMFFFFFFFFMMMMMA   ",
  "AAAMMFFFFFFFFFFMMMMAAA  ",
  "AAMMFFFFFFFFFFFFMMMMAA  ",
  "AAMMFFFFFFFFFFFFMMMMMA  ",
  " MMMFFFFFFFFFFFFMMMMMAA ",
  " MMMMFFFFFFFFFFMMMMMAAAA",
  "  MMMMFFFFFFFFMMMMMMAALA",
  "   MMMMMFFFFFFMMMMMMAAAA",
  "    MMMMMMMMMMMMMMM  AA ",
  "    SSMMMMMMMMMSSS      ",
  "    SSSMMMMMMMSSSS      ",
  "     MMM     MMM        ",
  "    MMMM     MMMM       ",
];

const SIGNATURE_CLOUD = [
  "       AA    AA          ",
  "      AAAA  AAAA         ",
  "     AALAA  AALAA        ",
  "      AAAA  AAAA         ",
  "       AAMMMMMAA         ",
  "      MMMMMMMMMMM        ",
  "    MMMMMMMMMMMMMMM      ",
  "   MMMMLLLLLLLMMMMMM     ",
  " AAMMFFFFFFFFFFFMMMAA    ",
  "AAA MFFFFFFFFFFFMM AAA   ",
  "AAAAFFFFFFFFFFFFFMAAAA   ",
  " AAAFFFFFFFFFFFFFMAAA    ",
  "  MMFFFFFFFFFFFFFMMM     ",
  "  MMMFFFFFFFFFFFMMMM     ",
  "   MMMFFFFFFFFFMMMM      ",
  "    MMMFFFFFFFMMMM       ",
  "     MMMMMMMMMMM         ",
  "     SSMMMMMMMSS         ",
  "     SSSMMMMMSSS         ",
  "      MMM   MMM          ",
  "     MMMM   MMMM         ",
];

const SIGNATURE_CRYSTAL = [
  "       A       A         ",
  "      AAA     AAA        ",
  "     AADAA   AADAA       ",
  "     AADAAA AAADAA       ",
  "      AAAAAAAAAA         ",
  "      MMMMMMMMMM         ",
  "     MMMMMMMMMMMM        ",
  "    MMMMMMMMMMMMMM       ",
  "     MMMLLLLLLMMMMM      ",
  "    MMMFFFFFFFFMMMM      ",
  "   MMMFFFFFFFFFFMMMM     ",
  " AAMMFFFFFFFFFFFFMMAA    ",
  "AAAMMFFFFFFFFFFFFMMAAA   ",
  "AA  MMFFFFFFFFFFMM  AA   ",
  "    MMMFFFFFFFFMMMM      ",
  "     MMMFFFFFFMMMM       ",
  "      MMMMMMMMMM         ",
  "      SSMMMMMMSS         ",
  "      SSSMMMMSSS         ",
  "       MMM  MMM          ",
  "      MMMM  MMMM         ",
];

function animateSignatureAppendages(layout: CreatureLayout, sway: number) {
  if (sway === 0) return;
  const additions = new Set<string>();
  layout.secondary.forEach((pixel) => {
    const [x, y] = pixel.split(",").map(Number);
    if (y >= 17) return;
    const direction = x < GRID_SIZE / 2 ? -sway : sway;
    addPoint(additions, x + direction, y);
  });
  additions.forEach((pixel) => layout.secondary.add(pixel));
}

type SignatureKind = "verdant" | "astral" | "ember" | "tide" | "cloud" | "crystal";

function createSignatureLayout(kind: SignatureKind, sway: number): CreatureLayout {
  let layout: CreatureLayout;
  if (kind === "verdant") {
    layout = layoutFromTemplate(SIGNATURE_VERDANT, [[9, 14], [15, 14]], [12, 17], [18, 10], 4, 7);
    [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => addPoint(layout.shadowDetails, 21 + dx, 17 + dy));
  } else if (kind === "astral") {
    layout = layoutFromTemplate(SIGNATURE_ASTRAL, [[8, 15], [15, 15]], [12, 17], [18, 12], 2, 7);
    [[24, 23], [25, 22], [26, 21], [27, 20], [28, 19], [29, 18], [30, 19], [30, 20], [29, 21], [28, 21], [29, 22], [30, 22], [30, 23], [29, 24], [28, 24], [27, 23], [26, 23]]
      .forEach(([x, y]) => addPoint(layout.secondary, x, y));
    [[29, 18], [30, 22], [27, 20]].forEach(([x, y]) => addPoint(layout.lightDetails, x, y));
  } else if (kind === "ember") {
    layout = layoutFromTemplate(SIGNATURE_EMBER, [[9, 14], [16, 14]], [13, 17], [19, 11], 4, 7);
  } else if (kind === "tide") {
    layout = layoutFromTemplate(SIGNATURE_TIDE, [[10, 13], [17, 13]], [14, 16], [20, 11], 3, 7);
  } else if (kind === "cloud") {
    layout = layoutFromTemplate(SIGNATURE_CLOUD, [[10, 12], [16, 12]], [13, 15], [19, 10], 3, 7);
  } else {
    layout = layoutFromTemplate(SIGNATURE_CRYSTAL, [[9, 12], [16, 12]], [13, 15], [18, 10], 4, 7);
  }
  animateSignatureAppendages(layout, sway);
  return layout;
}

function signatureEvolution(
  stage: 1 | 2 | 3,
  sway: number,
  progression: [SignatureKind, SignatureKind, SignatureKind],
): CreatureLayout | undefined {
  const kind = progression[stage - 1];
  return kind ? createSignatureLayout(kind, sway) : undefined;
}

function keepInside(detail: PixelSet, body: PixelSet): PixelSet {
  return new Set([...detail].filter((pixel) => body.has(pixel)));
}

function decorateLayout(layout: CreatureLayout, lineage: number, stage: 1 | 2 | 3) {
  if (layout.artDirected) return;
  const [leftEye, rightEye] = layout.eyes;
  const faceX = (leftEye[0] + rightEye[0]) / 2;
  const faceY = (leftEye[1] + rightEye[1]) / 2 + 1;

  if (lineage === 0) {
    addEllipse(layout.face, faceX, faceY + 1, stage === 3 ? 4.5 : 5.5, stage === 3 ? 4.5 : 5.5);
    addPolygon(layout.lightDetails, [[faceX - 5, faceY - 3], [faceX - 1, faceY - 6], [faceX + 1, faceY - 2], [faceX - 2, faceY + 1]]);
    if (stage === 1) {
      const starX = faceX + 5;
      const starY = faceY - 5;
      [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => addPoint(layout.shadowDetails, starX + dx, starY + dy));
    }
  } else if (lineage === 1) {
    const moon = new Set<string>();
    const cutout = new Set<string>();
    addEllipse(moon, faceX + 1, faceY - 6, stage === 1 ? 3 : 4, 3.5);
    addEllipse(cutout, faceX + 3, faceY - 7, stage === 1 ? 2 : 3, 2.8);
    cutout.forEach((pixel) => moon.delete(pixel));
    layout.lightDetails = moon;
  } else if (lineage === 2) {
    addEllipse(layout.face, faceX - 0.5, faceY + 3, stage === 1 ? 4 : 5, stage === 1 ? 3 : 4);
    addPolygon(layout.lightDetails, [[faceX + 3, faceY - 6], [faceX + 6, faceY - 3], [faceX + 3, faceY + 1], [faceX + 1, faceY - 2]]);
  } else if (lineage === 3) {
    addRect(layout.face, leftEye[0] - 2, leftEye[1] - 2, 4, 5);
    addRect(layout.face, rightEye[0] - 1, rightEye[1] - 2, 4, 5);
    addPoint(layout.lightDetails, faceX, faceY - 2);
    addPoint(layout.lightDetails, faceX + 1, faceY - 3);
  } else if (lineage === 4) {
    addEllipse(layout.face, faceX, faceY + 1, stage === 1 ? 5 : 4, 4.5);
    addPoint(layout.lightDetails, faceX + 3, faceY + 1);
    addPoint(layout.lightDetails, faceX + 2, faceY + 2);
  } else {
    addPolygon(layout.face, [[faceX - 5, faceY - 4], [faceX + 3, faceY - 5], [faceX + 5, faceY], [faceX, faceY + 5], [faceX - 5, faceY + 2]]);
    addPolygon(layout.lightDetails, [[faceX - 5, faceY - 4], [faceX, faceY - 5], [faceX - 1, faceY + 1], [faceX - 5, faceY + 2]]);
    addPolygon(layout.shadowDetails, [[faceX, faceY + 3], [faceX + 5, faceY], [faceX + 3, faceY + 5]]);
  }

  layout.face = keepInside(layout.face, layout.main);
  layout.lightDetails = keepInside(layout.lightDetails, layout.main);
  layout.shadowDetails = keepInside(layout.shadowDetails, layout.main);
}

function applyIdlePose(layout: CreatureLayout, phase: number) {
  if (phase !== 1 && phase !== 3) return;
  const additions = new Set<string>();
  layout.main.forEach((pixel) => {
    const [x, y] = pixel.split(",").map(Number);
    if (phase === 1 && y < layout.baseline - 5 && !layout.main.has(pointKey(x, y - 1))) {
      addPoint(additions, x, y - 1);
    }
    if (phase === 3 && y >= layout.baseline - 13 && y < layout.baseline - 4) {
      if (!layout.main.has(pointKey(x - 1, y))) addPoint(additions, x - 1, y);
      if (!layout.main.has(pointKey(x + 1, y))) addPoint(additions, x + 1, y);
    }
  });
  additions.forEach((pixel) => layout.main.add(pixel));
}

function addFeet(layout: CreatureLayout, positions: number[], y = 29, width = 3) {
  positions.forEach((x) => addRect(layout.main, x, y - 1, width, 2));
}

function floraLayout(stage: 1 | 2 | 3, sway: number): CreatureLayout {
  const directed = signatureEvolution(stage, sway, ["verdant", "ember", "cloud"]);
  if (directed) return directed;
  if (stage === 1) {
    const signature = layoutFromTemplate(SIGNATURE_VERDANT, [[9, 14], [15, 14]], [12, 17], [18, 10], 4, 7);
    [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => addPoint(signature.shadowDetails, 21 + dx, 17 + dy));
    animateSignatureAppendages(signature, sway);
    return signature;
  }
  const layout = baseLayout();
  if (stage === 2) {
    addEllipse(layout.main, 16, 20, 12, 9);
    addFeet(layout, [6, 22], 29, 4);
    addPolygon(layout.secondary, [[10, 13], [3, 4 + sway], [12, 8]]);
    addPolygon(layout.secondary, [[20, 11], [29, 3 - sway], [27, 13]]);
    addLine(layout.secondary, [16, 12], [16, 6], 2);
    addEllipse(layout.secondary, 16, 5 + sway, 2, 2);
    layout.eyes = [[12, 19], [20, 19]]; layout.mouth = [16, 24]; layout.mark = [23, 16];
  } else {
    addEllipse(layout.main, 20, 22, 10, 6);
    addEllipse(layout.main, 9, 18, 6, 8);
    addFeet(layout, [8, 14, 21, 26], 29, 3);
    addPolygon(layout.secondary, [[7, 11], [2, 3 + sway], [10, 8]]);
    addPolygon(layout.secondary, [[11, 11], [17, 2 - sway], [16, 12]]);
    addLine(layout.secondary, [27, 20], [29, 14 + sway], 2);
    addPolygon(layout.secondary, [[27, 16], [29, 9], [29, 19]]);
    layout.eyes = [[7, 17], [12, 17]]; layout.mouth = [9, 21]; layout.mark = [21, 20];
  }
  return layout;
}

function astralLayout(stage: 1 | 2 | 3, sway: number): CreatureLayout {
  const directed = signatureEvolution(stage, sway, ["astral", "tide", "crystal"]);
  if (directed) return directed;
  if (stage === 1) {
    const signature = layoutFromTemplate(SIGNATURE_ASTRAL, [[8, 15], [15, 15]], [12, 17], [18, 12], 2, 7);
    [[24, 23], [25, 22], [26, 21], [27, 20], [28, 19], [29, 18], [30, 19], [30, 20], [29, 21], [28, 21], [29, 22], [30, 22], [30, 23], [29, 24], [28, 24], [27, 23], [26, 23]]
      .forEach(([x, y]) => addPoint(signature.secondary, x, y));
    [[29, 18], [30, 22], [27, 20]].forEach(([x, y]) => addPoint(signature.lightDetails, x, y));
    animateSignatureAppendages(signature, sway);
    return signature;
  }
  const layout = baseLayout();
  if (stage === 2) {
    addEllipse(layout.main, 15, 22, 12, 8);
    addFeet(layout, [7, 21], 29, 4);
    addLine(layout.secondary, [9, 17], [5, 6 + sway], 2); addEllipse(layout.secondary, 5, 4 + sway, 3, 3);
    addLine(layout.secondary, [20, 16], [26, 7 - sway], 2); addEllipse(layout.secondary, 27, 5 - sway, 2, 2);
    addLine(layout.secondary, [26, 22], [29, 17], 2); addPolygon(layout.secondary, [[27, 19], [29, 12], [29, 22]]);
    layout.eyes = [[11, 22], [19, 22]]; layout.mouth = [15, 25]; layout.mark = [20, 16];
  } else {
    addEllipse(layout.main, 9, 18, 6, 8);
    addEllipse(layout.main, 20, 23, 11, 6);
    addPolygon(layout.main, [[18, 19], [28, 17], [29, 24], [25, 28], [16, 27]]);
    addLine(layout.secondary, [6, 12], [3, 3 + sway], 2); addEllipse(layout.secondary, 3, 2 + sway, 3, 3);
    addLine(layout.secondary, [12, 12], [18, 4 - sway], 2); addEllipse(layout.secondary, 19, 3 - sway, 2, 2);
    addPolygon(layout.secondary, [[26, 20], [29, 12], [29, 23]]);
    addFeet(layout, [15, 24], 29, 4);
    layout.eyes = [[7, 18], [12, 18]]; layout.mouth = [9, 22]; layout.mark = [21, 22];
  }
  return layout;
}

function emberLayout(stage: 1 | 2 | 3, sway: number): CreatureLayout {
  const directed = signatureEvolution(stage, sway, ["ember", "crystal", "astral"]);
  if (directed) return directed;
  if (stage === 1) {
    const signature = layoutFromTemplate(SIGNATURE_EMBER, [[9, 14], [16, 14]], [13, 17], [19, 11], 4, 7);
    animateSignatureAppendages(signature, sway);
    return signature;
  }
  const layout = baseLayout();
  if (stage === 2) {
    addEllipse(layout.main, 17, 22, 11, 7);
    addEllipse(layout.main, 8, 18, 6, 7);
    addFeet(layout, [7, 18, 24], 29, 4);
    addLine(layout.secondary, [25, 23], [29, 17 + sway], 3);
    addPolygon(layout.secondary, [[27, 19], [29, 8 + sway], [29, 23]]);
    addPolygon(layout.secondary, [[7, 12], [9, 5 - sway], [12, 14]]);
    addPolygon(layout.lightDetails, [[16, 17], [20, 14], [22, 19], [18, 21]]);
    layout.eyes = [[6, 18], [11, 18]]; layout.mouth = [8, 22]; layout.mark = [19, 22];
  } else {
    addPolygon(layout.main, [[10, 11], [20, 9], [25, 16], [23, 29], [8, 29], [6, 19]]);
    addEllipse(layout.main, 11, 12, 7, 7);
    addFeet(layout, [8, 21], 30, 4);
    addPolygon(layout.secondary, [[18, 16], [29, 7 + sway], [25, 23]]);
    addPolygon(layout.secondary, [[8, 8], [7, 1], [12, 8]]);
    addLine(layout.secondary, [23, 25], [30, 19], 3);
    addPolygon(layout.secondary, [[27, 21], [29, 9 - sway], [29, 24]]);
    layout.eyes = [[8, 12], [14, 12]]; layout.mouth = [11, 17]; layout.mark = [18, 21]; layout.baseline = 30;
  }
  return layout;
}

function tideLayout(stage: 1 | 2 | 3, sway: number): CreatureLayout {
  const directed = signatureEvolution(stage, sway, ["tide", "cloud", "verdant"]);
  if (directed) return directed;
  if (stage === 1) {
    const signature = layoutFromTemplate(SIGNATURE_TIDE, [[10, 13], [17, 13]], [14, 16], [20, 11], 3, 7);
    animateSignatureAppendages(signature, sway);
    return signature;
  }
  const layout = baseLayout();
  if (stage === 2) {
    addEllipse(layout.main, 16, 22, 12, 7);
    addFeet(layout, [8, 20], 29, 4);
    addLine(layout.secondary, [8, 19], [2, 13 + sway], 3);
    addLine(layout.secondary, [8, 23], [1, 22 - sway], 3);
    addLine(layout.secondary, [25, 22], [29, 16], 3);
    addPolygon(layout.secondary, [[27, 18], [29, 9], [29, 24]]);
    addPolygon(layout.lightDetails, [[13, 16], [18, 13], [22, 17], [17, 20]]);
    layout.eyes = [[12, 21], [20, 21]]; layout.mouth = [16, 25]; layout.mark = [22, 18];
  } else {
    addEllipse(layout.main, 8, 18, 6, 8);
    addEllipse(layout.main, 17, 22, 9, 6);
    addEllipse(layout.main, 25, 23, 7, 5);
    addLine(layout.main, [27, 22], [29, 16 + sway], 3);
    addPolygon(layout.secondary, [[27, 19], [29, 8 + sway], [29, 24]]);
    addLine(layout.secondary, [5, 13], [2, 6], 3);
    addLine(layout.secondary, [5, 18], [2, 18], 3);
    addPolygon(layout.secondary, [[14, 20], [20, 9], [23, 22]]);
    layout.eyes = [[6, 18], [11, 18]]; layout.mouth = [8, 22]; layout.mark = [20, 23];
  }
  return layout;
}

function cloudLayout(stage: 1 | 2 | 3, sway: number): CreatureLayout {
  const directed = signatureEvolution(stage, sway, ["cloud", "verdant", "tide"]);
  if (directed) return directed;
  if (stage === 1) {
    const signature = layoutFromTemplate(SIGNATURE_CLOUD, [[10, 12], [16, 12]], [13, 15], [19, 10], 3, 7);
    animateSignatureAppendages(signature, sway);
    return signature;
  }
  const layout = baseLayout();
  if (stage === 2) {
    addEllipse(layout.main, 16, 20, 7, 10);
    addPolygon(layout.secondary, [[10, 18], [1, 9 + sway], [4, 25], [12, 27]]);
    addPolygon(layout.secondary, [[22, 18], [29, 9 - sway], [28, 25], [20, 27]]);
    addPolygon(layout.main, [[10, 13], [11, 4], [16, 11], [22, 3], [22, 14]]);
    addFeet(layout, [10, 20], 29, 4);
    layout.eyes = [[13, 18], [20, 18]]; layout.mouth = [16, 23]; layout.mark = [16, 26];
  } else {
    addEllipse(layout.main, 8, 20, 6, 7);
    addEllipse(layout.main, 19, 23, 10, 6);
    addPolygon(layout.main, [[3, 19], [7, 15], [12, 20], [8, 25]]);
    addPolygon(layout.secondary, [[13, 21], [14, 4 + sway], [21, 19]]);
    addPolygon(layout.secondary, [[19, 20], [26, 5 - sway], [27, 23]]);
    addPolygon(layout.secondary, [[26, 22], [30, 15], [29, 28], [24, 26]]);
    addFeet(layout, [13, 23], 30, 4);
    layout.eyes = [[6, 19], [11, 19]]; layout.mouth = [8, 23]; layout.mark = [20, 23]; layout.baseline = 30;
  }
  return layout;
}

function crystalLayout(stage: 1 | 2 | 3, sway: number): CreatureLayout {
  const directed = signatureEvolution(stage, sway, ["crystal", "astral", "ember"]);
  if (directed) return directed;
  if (stage === 1) {
    const signature = layoutFromTemplate(SIGNATURE_CRYSTAL, [[10, 13], [17, 13]], [14, 16], [20, 11], 4, 7);
    animateSignatureAppendages(signature, sway);
    return signature;
  }
  const layout = baseLayout();
  if (stage === 2) {
    addPolygon(layout.main, [[6, 15], [16, 10], [26, 15], [29, 24], [24, 29], [8, 29], [3, 23]]);
    addFeet(layout, [7, 22], 29, 4);
    addPolygon(layout.secondary, [[10, 14], [11, 3 + sway], [17, 12]]);
    addPolygon(layout.secondary, [[18, 12], [24, 4 - sway], [26, 16]]);
    addPolygon(layout.lightDetails, [[6, 16], [15, 11], [13, 20], [8, 23]]);
    layout.eyes = [[12, 20], [21, 20]]; layout.mouth = [17, 25]; layout.mark = [17, 15];
  } else {
    addPolygon(layout.main, [[10, 10], [21, 10], [26, 16], [24, 30], [8, 30], [5, 17]]);
    addPolygon(layout.main, [[2, 15], [7, 13], [9, 26], [3, 26], [1, 21]]);
    addPolygon(layout.main, [[24, 15], [28, 12], [30, 19], [28, 28], [23, 26]]);
    addFeet(layout, [8, 21], 30, 4);
    addPolygon(layout.secondary, [[10, 12], [12, 1 + sway], [17, 10]]);
    addPolygon(layout.secondary, [[18, 10], [24, 2 - sway], [26, 14]]);
    addPolygon(layout.lightDetails, [[6, 16], [14, 10], [13, 20], [8, 24]]);
    layout.eyes = [[12, 17], [21, 17]]; layout.mouth = [17, 22]; layout.mark = [17, 26]; layout.baseline = 30;
  }
  return layout;
}

const LINEAGES = [
  { name: "Verdejante", build: floraLayout },
  { name: "Astral", build: astralLayout },
  { name: "Ígneo", build: emberLayout },
  { name: "Abissal", build: tideLayout },
  { name: "Celeste", build: cloudLayout },
  { name: "Cristalino", build: crystalLayout },
] as const;

export function lineageName(genome: NimviGenome): string {
  return LINEAGES[genome.body % LINEAGES.length].name;
}

export function buildPixelFrame(
  genome: NimviGenome,
  stage: 1 | 2 | 3,
  animationFrame: number,
  reaction: "idle" | "blink" | "love" | "play" | "wake" = "idle",
): PixelFrame {
  const frame = makeFrame();
  const palette = PALETTES[genome.palette];
  const phase = animationFrame % 4;
  const sway = phase === 1 ? -1 : phase === 3 ? 1 : 0;
  const lineage = genome.body % LINEAGES.length;
  const layout = LINEAGES[lineage].build(stage, sway);
  if (!layout.artDirected) {
    throw new Error(`Nimvi lineage ${lineage}, stage ${stage} bypassed the art-directed quality gate`);
  }
  decorateLayout(layout, lineage, stage);
  applyIdlePose(layout, phase);
  const setCell = (x: number, y: number, color: string) => {
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) frame[y][x] = color;
  };

  const silhouette = new Set([...layout.main, ...layout.secondary]);
  silhouette.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        if ((ox === 0 && oy === 0) || silhouette.has(pointKey(x + ox, y + oy))) continue;
        setCell(x + ox, y + oy, palette.outline);
      }
    }
  });

  layout.main.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    const upperEdge = !layout.main.has(pointKey(x, y - 1));
    const lowerEdge = !layout.main.has(pointKey(x, y + 1));
    const color = upperEdge && y < layout.baseline - 6 && x <= 14
      ? palette.light
      : (lowerEdge && y > layout.baseline - 6) || (x > 24 && y > 18)
        ? palette.shadow
        : palette.body;
    setCell(x, y, color);
  });

  layout.secondary.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    const upperEdge = !layout.secondary.has(pointKey(x, y - 1));
    setCell(x, y, upperEdge ? palette.light : palette.accent);
  });
  layout.secondaryDetails.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    if (layout.secondary.has(key)) setCell(x, y, palette.eyes);
  });

  layout.face.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    setCell(x, y, palette.light);
  });
  layout.shadowDetails.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    setCell(x, y, palette.shadow);
  });
  layout.lightDetails.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    setCell(x, y, lineage === 1 ? palette.accent : palette.light);
  });

  const [markX, markY] = layout.mark;
  const markPatterns: Point[][] = [
    [[0, 0], [1, 0]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]],
    [[0, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 0], [-1, 0], [1, 0], [-1, 1], [1, 1]],
    [[0, 0], [0, -1], [0, 1], [1, -2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [1, 2]],
    [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
    [[0, 0], [-1, 1], [1, 1], [-2, 2], [2, 2]],
    [[0, 0], [1, -1], [2, -1], [2, 0], [1, 1]],
  ];
  if (!layout.artDirected) {
    markPatterns[genome.marking].forEach(([dx, dy], index) => {
      if (layout.main.has(pointKey(markX + dx, markY + dy))) setCell(markX + dx, markY + dy, index % 2 ? palette.light : palette.accent);
    });
  }

  const blink = reaction === "blink" || phase === 2;
  const [[leftEyeX, leftEyeY], [rightEyeX, rightEyeY]] = layout.eyes;
  if (reaction === "love") {
    setCell(leftEyeX, leftEyeY, palette.accent); setCell(leftEyeX - 1, leftEyeY - 1, palette.accent);
    setCell(rightEyeX, rightEyeY, palette.accent); setCell(rightEyeX + 1, rightEyeY - 1, palette.accent);
  } else if (blink) {
    const leftLidY = leftEyeY - 1;
    const rightLidY = rightEyeY - 1;
    setCell(leftEyeX, leftLidY, palette.outline); setCell(leftEyeX + 1, leftLidY, palette.outline);
    setCell(rightEyeX, rightLidY, palette.outline); setCell(rightEyeX + 1, rightLidY, palette.outline);
  } else {
    const eyeWidth = genome.eyes % 3 === 0 ? 1 : 2;
    [[leftEyeX, leftEyeY], [rightEyeX, rightEyeY]].forEach(([eyeX, eyeBaseY]) => {
      for (let eyeY = -2; eyeY <= 0; eyeY += 1) {
        for (let eyeOffset = 0; eyeOffset < eyeWidth; eyeOffset += 1) setCell(eyeX + eyeOffset, eyeBaseY + eyeY, palette.eyes);
      }
    });
    if (genome.eyes >= 5) {
      setCell(leftEyeX, leftEyeY - 2, palette.light);
      setCell(rightEyeX, rightEyeY - 2, palette.light);
    }
  }

  const [mouthX, mouthY] = layout.mouth;
  if (reaction === "play") {
    setCell(mouthX - 1, mouthY, palette.outline); setCell(mouthX, mouthY + 1, palette.outline); setCell(mouthX + 1, mouthY, palette.outline);
  } else if (genome.mouth === 0) setCell(mouthX, mouthY, palette.outline);
  else if (genome.mouth === 1) { setCell(mouthX - 1, mouthY, palette.outline); setCell(mouthX, mouthY + 1, palette.outline); setCell(mouthX + 1, mouthY, palette.outline); }
  else if (genome.mouth === 2) { setCell(mouthX - 1, mouthY + 1, palette.outline); setCell(mouthX, mouthY, palette.outline); }
  else if (genome.mouth === 3) { setCell(mouthX, mouthY, palette.outline); setCell(mouthX + 1, mouthY, palette.outline); }
  else { setCell(mouthX - 1, mouthY, palette.outline); setCell(mouthX + 1, mouthY, palette.outline); }

  return frame;
}

export function frameSignature(frame: PixelFrame): string {
  return frame.map((row) => row.map((pixel) => pixel ?? ".").join("|")).join("\n");
}
