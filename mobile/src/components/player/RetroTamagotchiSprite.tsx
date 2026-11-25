import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import {
  SPRITE_GRID_SIZE,
  SpriteClassArchetype,
  SpritePalette,
  SpritePose,
  SpriteRaceTrait,
  buildRetroSpritePixels,
} from '../../lib/retro-sprite';
import { TamagotchiAppearance } from '../../lib/tamagotchi-appearance';

interface RetroTamagotchiSpriteProps {
  palette: SpritePalette;
  archetype: SpriteClassArchetype;
  race: SpriteRaceTrait;
  pose: SpritePose;
  facing: 'left' | 'right';
  size?: number;
  appearance?: TamagotchiAppearance | null;
  frame?: number;
}

export const RetroTamagotchiSprite: React.FC<RetroTamagotchiSpriteProps> = ({
  palette,
  archetype,
  race,
  pose,
  facing,
  size = 132,
  appearance,
  frame = 0,
}) => {
  const rects = useMemo(
    () =>
      buildRetroSpritePixels({
        palette,
        archetype,
        race,
        pose,
        appearance,
        frame,
      }),
    [palette, archetype, race, pose, appearance, frame]
  );

  return (
    <View
      style={{
        width: size,
        height: size,
        transform: [{ scaleX: facing === 'left' ? -1 : 1 }],
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${SPRITE_GRID_SIZE} ${SPRITE_GRID_SIZE}`}
      >
        {rects.map((r, idx) => (
          <Rect
            key={`${idx}-${r.x}-${r.y}`}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={r.fill}
          />
        ))}
      </Svg>
    </View>
  );
};
