import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { DieValue } from '../../lib/locandiere-dice';
import { PixelRect, SPRITE_GRID_SIZE } from '../../lib/retro-sprite';

export type InnkeeperMood = 'idle' | 'rolling' | 'happy' | 'grumpy';

interface InnkeeperSpriteProps {
  size?: number;
  mood?: InnkeeperMood;
}

function buildInnkeeper48Rects(mood: InnkeeperMood): PixelRect[] {
  const N = SPRITE_GRID_SIZE;
  const grid = Array.from({ length: N }, () => Array.from({ length: N }, () => '.'));
  const set = (x: number, y: number, t: string) => {
    if (x >= 0 && x < N && y >= 0 && y < N) grid[y][x] = t;
  };
  const fill = (x: number, y: number, w: number, h: number, t: string) => {
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) set(x + dx, y + dy, t);
    }
  };
  const outline = (x: number, y: number, w: number, h: number, t: string) => {
    fill(x, y, w, h, 'O');
    if (w > 2 && h > 2) fill(x + 1, y + 1, w - 2, h - 2, t);
  };
  const row = (y: number, xs: number, pat: string) => {
    for (let i = 0; i < pat.length; i += 1) {
      if (pat[i] !== '.' && pat[i] !== ' ') set(xs + i, y, pat[i]);
    }
  };

  const isRolling = mood === 'rolling';
  const isHappy = mood === 'happy';
  const isGrumpy = mood === 'grumpy';

  const hy = isHappy ? 6 : 7;
  const by = isHappy ? 20 : 21;

  // Boots & Trousers
  outline(15, 38, 7, 6, 'B');
  outline(26, 38, 7, 6, 'B');
  fill(15, 43, 7, 1, 'O');
  fill(26, 43, 7, 1, 'O');

  // Broad Innkeeper Waistcoat & Cream Linen Shirt
  outline(12, by, 24, 15, 'V');
  fill(13, by + 1, 22, 4, 'v');
  // Open shirt V-collar
  fill(21, by + 1, 6, 6, 'L');
  set(23, by + 4, 's');
  set(24, by + 5, 's');
  // Brass waistcoat buttons
  set(20, by + 7, 'G');
  set(20, by + 9, 'G');
  set(27, by + 7, 'G');
  set(27, by + 9, 'G');

  // Cream Tavern Apron (grembiule con tasca e laccio)
  outline(14, by + 9, 20, 14, 'A');
  fill(15, by + 9, 18, 2, 'T'); // waist tie
  outline(19, by + 14, 10, 5, 'T'); // front pocket
  fill(20, by + 15, 8, 3, 'A');

  // Rolled-up Linen Sleeves & Muscular Forearms
  const rArmY = isRolling ? by - 2 : by + 2;
  outline(7, by + 2, 6, 6, 'L'); // left rolled sleeve
  fill(8, by + 6, 4, 1, 'T');
  outline(7, by + 7, 6, 7, 'S'); // left forearm
  fill(8, by + 11, 4, 2, 's');

  outline(35, rArmY, 6, 6, 'L'); // right rolled sleeve
  fill(36, rArmY + 4, 4, 1, 'T');
  outline(35, rArmY + 5, 6, 7, 'S'); // right forearm
  fill(36, rArmY + 9, 4, 2, 's');

  if (isRolling) {
    // Shaking pair of ivory dice in right hand!
    outline(36, rArmY - 5, 5, 5, 'L');
    set(38, rArmY - 3, 'O');
    outline(41, rArmY - 3, 5, 5, 'L');
    set(43, rArmY - 1, 'O');
  }

  // Neck
  outline(20, hy + 12, 8, 3, 's');

  // Head & Jovial Balding Crown with Sideburns
  outline(14, hy + 3, 4, 7, 'H'); // left sideburn tuft
  outline(30, hy + 3, 4, 7, 'H'); // right sideburn tuft
  row(hy + 0, 19, 'OOOOOOOOOO');
  row(hy + 1, 17, 'OOSSSSSSSSSSOO');
  for (let dy = 2; dy <= 10; dy += 1) {
    row(hy + dy, 16, 'OSSSSSSSSSSSSSSO');
  }
  row(hy + 11, 17, 'OOssssssssssOO');
  row(hy + 12, 19, 'OOOOOOOOOO');

  // Balding forehead shine
  row(hy + 2, 20, 'llSSSSll');
  // Rosy tavern cheeks
  fill(17, hy + 7, 3, 2, 'R');
  fill(28, hy + 7, 3, 2, 'R');

  // Expressive Eyebrows & Eyes
  if (isGrumpy) {
    row(hy + 4, 18, 'HH..');
    row(hy + 5, 20, 'HH');
    row(hy + 5, 26, 'HH');
    row(hy + 4, 28, '..HH');
  } else {
    row(hy + 4, 18, 'HHHH');
    row(hy + 4, 26, 'HHHH');
  }

  if (isHappy) {
    row(hy + 6, 18, 'OOOO');
    row(hy + 6, 26, 'OOOO');
  } else {
    set(19, hy + 5, 'L');
    set(20, hy + 5, 'O');
    set(19, hy + 6, 'O');
    set(20, hy + 6, 'O');
    set(27, hy + 5, 'L');
    set(28, hy + 5, 'O');
    set(27, hy + 6, 'O');
    set(28, hy + 6, 'O');
  }

  // Bulbous nose
  fill(23, hy + 6, 2, 2, 'R');

  // Magnificent Curled Handlebar Mustache & Chin Beard
  outline(17, hy + 8, 14, 4, 'H');
  fill(19, hy + 9, 10, 2, 'h');
  outline(14, hy + 7, 4, 4, 'H'); // left curl
  outline(30, hy + 7, 4, 4, 'H'); // right curl
  if (isHappy) {
    row(hy + 11, 22, 'LLLL');
  } else if (isGrumpy) {
    row(hy + 11, 22, 'RRRR');
  }

  const palette: Record<string, string> = {
    O: '#120D0A',
    S: '#F2C6A0',
    s: '#D49E76',
    l: '#FBE3CE',
    R: '#E0826D',
    H: '#5A321E',
    h: '#7C472B',
    V: '#3E2723',
    v: '#543630',
    L: '#F8F4EC',
    A: '#EFE6D5',
    T: '#C8B698',
    G: '#EAB308',
    B: '#2A1A14',
  };

  const rects: PixelRect[] = [];
  for (let y = 0; y < N; y += 1) {
    let x = 0;
    while (x < N) {
      const tok = grid[y][x];
      const hex = palette[tok];
      if (!hex) {
        x += 1;
        continue;
      }
      let w = 1;
      while (x + w < N && grid[y][x + w] === tok) w += 1;
      rects.push({ x, y, w, h: 1, fill: hex });
      x += w;
    }
  }
  return rects;
}

/**
 * 48x48 pixel-art SVG sprite for the Tavern Innkeeper, matching the upgraded
 * 48x48 hero density across the Tavern.
 */
export const InnkeeperSprite: React.FC<InnkeeperSpriteProps> = ({
  size = 68,
  mood = 'idle',
}) => {
  const rects = useMemo(() => buildInnkeeper48Rects(mood), [mood]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${SPRITE_GRID_SIZE} ${SPRITE_GRID_SIZE}`}>
        {rects.map((r, idx) => (
          <Rect key={`${idx}-${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
        ))}
      </Svg>
    </View>
  );
};

interface BrassDieTrophyProps {
  size?: number;
}

/**
 * 24x24 high-density pixel-art Brass Die trophy unlocked on first Innkeeper victory.
 */
export const BrassDieTrophy: React.FC<BrassDieTrophyProps> = ({ size = 22 }) => {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {/* Top-right star gleam */}
        <Rect x={19} y={1} width={2} height={5} fill="#FEF08A" />
        <Rect x={17} y={2.5} width={6} height={2} fill="#FEF08A" />
        {/* Dark outline */}
        <Rect x={3} y={4} width={16} height={16} rx={3} fill="#120D0A" />
        {/* Brass body & bevels */}
        <Rect x={4} y={5} width={14} height={14} rx={2} fill="#D99B26" />
        <Rect x={5} y={5} width={12} height={2} fill="#FEF08A" />
        <Rect x={5} y={7} width={12} height={10} fill="#F5C451" />
        <Rect x={4} y={17} width={14} height={2} fill="#925A10" />
        {/* Engraved dark-bronze pips (face 5) */}
        <Rect x={7} y={8} width={2} height={2} fill="#451A03" />
        <Rect x={13} y={8} width={2} height={2} fill="#451A03" />
        <Rect x={10} y={11} width={2} height={2} fill="#451A03" />
        <Rect x={7} y={14} width={2} height={2} fill="#451A03" />
        <Rect x={13} y={14} width={2} height={2} fill="#451A03" />
      </Svg>
    </View>
  );
};

interface PippedDieFaceProps {
  value: DieValue;
  owner: 'player' | 'innkeeper';
  size?: number;
  busted?: boolean;
}

const PIP_POSITIONS: Record<DieValue, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 24],
    [72, 24],
    [28, 50],
    [72, 50],
    [28, 76],
    [72, 76],
  ],
};

export const PippedDieFace: React.FC<PippedDieFaceProps> = ({
  value,
  owner,
  size = 64,
  busted = false,
}) => {
  const isPlayer = owner === 'player';
  const bodyFill = isPlayer ? '#F5ECD7' : '#2C211B';
  const borderStroke = busted
    ? '#DC2626'
    : isPlayer
      ? '#C59B27'
      : '#D99B26';
  const innerShade = isPlayer ? '#E8D9B8' : '#1E1612';
  const pipFill =
    busted && value === 1
      ? '#DC2626'
      : isPlayer
        ? '#1E1410'
        : '#F5C451';

  const pips = PIP_POSITIONS[value];

  return (
    <View style={[styles.dieShadowWrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect
          x={4}
          y={4}
          width={92}
          height={92}
          rx={18}
          fill={bodyFill}
          stroke={borderStroke}
          strokeWidth={5}
        />
        <Rect
          x={11}
          y={11}
          width={78}
          height={78}
          rx={12}
          fill="none"
          stroke={innerShade}
          strokeWidth={2}
        />
        {pips.map(([cx, cy], idx) => (
          <Circle
            key={`${value}-${idx}`}
            cx={cx}
            cy={cy}
            r={value === 1 ? 11.5 : 8.5}
            fill={pipFill}
          />
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  dieShadowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
