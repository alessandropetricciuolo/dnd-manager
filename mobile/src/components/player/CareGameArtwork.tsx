import React, { useMemo, useRef } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '../../theme/colors';
import {
  GearItemId,
  GearStain,
  IngredientId,
  getIngredientById,
} from '../../lib/care-mini-games';

// ============================================================================
// Ingredient Icon (local RN SVG)
// ============================================================================

export const IngredientIcon: React.FC<{ id: IngredientId; size?: number }> = ({
  id,
  size = 24,
}) => {
  const meta = getIngredientById(id);

  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Circle cx="14" cy="14" r="13" fill="rgba(20, 18, 16, 0.85)" stroke={meta.color} strokeWidth="1.5" />
      {id === 'broth' && (
        <G>
          <Path d="M7 14h14c0 4.2-3 7-7 7s-7-2.8-7-7z" fill="#D97706" />
          <Path d="M10 11c0-1.5 1-2.5 1-3.5M14 10.5c0-1.5 1-2.5 1-3.5M18 11c0-1.5 1-2.5 1-3.5" stroke="#F1D899" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </G>
      )}
      {id === 'herbs' && (
        <G>
          <Path d="M8 20c2-7 7-11 13-12-1 6-5 11-12 12z" fill="#10B981" />
          <Line x1="9" y1="19" x2="18" y2="10" stroke="#064E3B" strokeWidth="1.3" strokeLinecap="round" />
        </G>
      )}
      {id === 'mushrooms' && (
        <G>
          <Path d="M7 15c0-4.5 3.2-7.5 7-7.5s7 3 7 7.5H7z" fill="#B45309" />
          <Rect x="11.5" y="15" width="5" height="6" rx="2" fill="#E7D8C9" />
          <Circle cx="11.5" cy="11.5" r="1.2" fill="#F5F2EB" />
          <Circle cx="16.2" cy="12" r="1" fill="#F5F2EB" />
        </G>
      )}
      {id === 'roots' && (
        <G>
          <Path d="M10 9l8 2-4 11-4-13z" fill="#EA580C" />
          <Path d="M13 8c-.5-2-2-2.5-3-2.5M15 8.5c1-1.8 2.2-2.2 3.2-2" stroke="#10B981" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </G>
      )}
      {id === 'spices' && (
        <G>
          <Path d="M14 6l2 5.2L21.5 13l-5.5 1.8L14 20l-2-5.2L6.5 13l5.5-1.8L14 6z" fill="#C89D49" />
          <Circle cx="14" cy="13" r="2" fill="#F1D899" />
        </G>
      )}
      {id === 'roast' && (
        <G>
          <Ellipse cx="13.5" cy="14" rx="6.5" ry="4.8" fill="#B91C1C" />
          <Ellipse cx="13.5" cy="14" rx="3.2" ry="2.2" fill="#FCA5A5" />
          <Circle cx="19.5" cy="11.5" r="1.7" fill="#F5F2EB" />
        </G>
      )}
    </Svg>
  );
};

// ============================================================================
// 1. La pentola della Taverna (hunger) Scene
// ============================================================================

export const CauldronScene: React.FC<{
  addedCount: number;
  completed: boolean;
  excellent: boolean;
  characterName: string;
}> = ({ addedCount, completed, excellent, characterName }) => {
  const soupColor =
    addedCount === 0
      ? '#44403C'
      : addedCount === 1
      ? '#9A3412'
      : addedCount === 2
      ? '#B45309'
      : '#D97706';

  return (
    <View style={styles.sceneFrame}>
      <Svg width="100%" height={138} viewBox="0 0 280 138">
        {/* Tavern hearth arch */}
        <Rect x="0" y="0" width="280" height="138" rx="12" fill="#171310" />
        <Path
          d="M36 138 V52 C36 22 244 22 244 52 V138 Z"
          fill="#221B16"
          stroke="#3B322B"
          strokeWidth="2"
        />

        {!completed ? (
          <G>
            {/* Glowing embers under cauldron */}
            <Ellipse cx="140" cy="122" rx="46" ry="9" fill="rgba(234, 88, 12, 0.28)" />
            <Path d="M116 122 Q124 106 132 122 Z" fill="#EA580C" />
            <Path d="M132 122 Q140 102 148 122 Z" fill="#F59E0B" />
            <Path d="M148 122 Q156 108 164 122 Z" fill="#DC2626" />

            {/* Steam wisps */}
            <Path
              d="M118 48 C113 38 123 32 118 22"
              stroke="rgba(241, 216, 153, 0.45)"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M140 44 C135 33 145 27 140 16"
              stroke="rgba(241, 216, 153, 0.65)"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M162 48 C157 38 167 32 162 22"
              stroke="rgba(241, 216, 153, 0.45)"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />

            {/* Cast-iron cauldron */}
            <Path
              d="M92 64 C88 96 106 114 140 114 C174 114 192 96 188 64 Z"
              fill="#27221E"
              stroke="#54463C"
              strokeWidth="2.5"
            />
            {/* Brass handles */}
            <Path d="M90 70 C78 70 78 86 92 86" stroke="#C89D49" strokeWidth="3" fill="none" />
            <Path d="M190 70 C202 70 202 86 188 86" stroke="#C89D49" strokeWidth="3" fill="none" />

            {/* Soup surface */}
            <Ellipse cx="140" cy="64" rx="48" ry="11" fill="#1C1815" stroke="#54463C" strokeWidth="2" />
            <Ellipse cx="140" cy="64" rx="42" ry="8" fill={soupColor} />

            {/* Bubbles based on addedCount */}
            {addedCount >= 1 && <Circle cx="122" cy="63" r="3" fill="#FDE68A" opacity={0.85} />}
            {addedCount >= 2 && <Circle cx="152" cy="65" r="3.5" fill="#FDE68A" opacity={0.9} />}
            {addedCount >= 3 && <Circle cx="138" cy="61" r="4" fill="#FEF3C7" />}
          </G>
        ) : (
          <G>
            {/* Served Tavern bowl of stew */}
            <Ellipse cx="140" cy="108" rx="66" ry="12" fill="rgba(200, 157, 73, 0.16)" />
            <Path
              d="M92 70 C94 98 112 108 140 108 C168 108 186 98 188 70 Z"
              fill="#5C3A21"
              stroke="#C89D49"
              strokeWidth="2.2"
            />
            <Ellipse cx="140" cy="70" rx="48" ry="11" fill="#D97706" stroke="#F1D899" strokeWidth="1.8" />
            <Circle cx="124" cy="69" r="4" fill="#10B981" />
            <Circle cx="144" cy="71" r="4.5" fill="#B91C1C" />
            <Circle cx="158" cy="68" r="3.5" fill="#FDE68A" />
            {/* Aromatic steam */}
            <Path d="M122 54 C118 44 126 38 122 28" stroke="#F1D899" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <Path d="M140 50 C136 40 144 34 140 24" stroke="#F1D899" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <Path d="M158 54 C154 44 162 38 158 28" stroke="#F1D899" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            {/* Sparkles if excellent */}
            {excellent && (
              <G>
                <Circle cx="84" cy="46" r="3" fill="#F1D899" />
                <Circle cx="198" cy="42" r="3.5" fill="#10B981" />
                <Circle cx="206" cy="64" r="2.2" fill="#F1D899" />
              </G>
            )}
          </G>
        )}
      </Svg>
      {completed && (
        <View style={styles.pgReactionPill}>
          <Text style={styles.pgReactionText}>
            {excellent
              ? `${characterName}: «Che profumo! Il miglior stufato della Taverna!»`
              : `${characterName}: «Caldo e sostanzioso, proprio quello che serviva.»`}
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// 2. Il fuoco della branda (energy) Scene
// ============================================================================

export const HearthScene: React.FC<{
  fireLevel: number;
  isBlowing: boolean;
  completed: boolean;
  excellent: boolean;
  characterName: string;
}> = ({ fireLevel, isBlowing, completed, excellent, characterName }) => {
  const flameScale = Math.min(1.25, 0.35 + fireLevel * 0.25 + (isBlowing ? 0.18 : 0));

  return (
    <View style={styles.sceneFrame}>
      <Svg width="100%" height={138} viewBox="0 0 280 138">
        <Rect x="0" y="0" width="280" height="138" rx="12" fill="#15110F" />
        {/* Warm glow */}
        <Circle
          cx={completed ? 88 : 140}
          cy={82}
          r={34 + fireLevel * 14}
          fill={isBlowing ? 'rgba(249, 115, 22, 0.24)' : 'rgba(200, 157, 73, 0.14)'}
        />

        {!completed ? (
          <G>
            {/* Wrought-iron brazier */}
            <Path d="M100 94 L112 120 H168 L180 94 Z" fill="#27221E" stroke="#54463C" strokeWidth="2" />
            <Line x1="112" y1="120" x2="104" y2="132" stroke="#54463C" strokeWidth="3" strokeLinecap="round" />
            <Line x1="168" y1="120" x2="176" y2="132" stroke="#54463C" strokeWidth="3" strokeLinecap="round" />
            {/* Logs & embers */}
            <Ellipse cx="140" cy="94" rx="34" ry="8" fill="#451A03" />
            <Circle cx="124" cy="94" r="4" fill="#EA580C" />
            <Circle cx="142" cy="92" r="5" fill="#F59E0B" />
            <Circle cx="158" cy="95" r="4" fill="#DC2626" />

            {/* Growing Flame */}
            <G
              transform={`translate(140, 92) scale(${flameScale}) translate(-140, -92)`}
            >
              <Path
                d="M140 36 C158 58 166 74 158 92 H122 C114 74 122 58 140 36 Z"
                fill="#EA580C"
              />
              <Path
                d="M140 50 C152 66 155 78 149 92 H131 C125 78 128 66 140 50 Z"
                fill="#F59E0B"
              />
              <Path
                d="M140 66 C146 76 147 84 144 92 H136 C133 84 134 76 140 66 Z"
                fill="#FEF08A"
              />
            </G>
          </G>
        ) : (
          <G>
            {/* Warm brazier on the left */}
            <Path d="M58 98 L66 118 H108 L116 98 Z" fill="#27221E" stroke="#54463C" strokeWidth="2" />
            <Path d="M87 56 C100 72 104 84 98 98 H76 C70 84 74 72 87 56 Z" fill="#F97316" />
            <Path d="M87 68 C94 78 96 88 92 98 H82 C78 88 80 78 87 68 Z" fill="#FDE047" />

            {/* Tavern cot (branda) with sleeping PG on the right */}
            <Rect x="136" y="96" width="118" height="14" rx="4" fill="#4A3423" stroke="#7E5F24" strokeWidth="1.5" />
            <Line x1="144" y1="110" x2="144" y2="124" stroke="#4A3423" strokeWidth="4" strokeLinecap="round" />
            <Line x1="246" y1="110" x2="246" y2="124" stroke="#4A3423" strokeWidth="4" strokeLinecap="round" />
            {/* Pillow & sleeping head */}
            <Ellipse cx="156" cy="91" rx="14" ry="7" fill="#CDC5B4" />
            <Circle cx="158" cy="84" r="9" fill="#E6C29F" />
            {/* Closed peaceful eye */}
            <Path d="M155 84 Q158 86 161 84" stroke="#27221E" strokeWidth="1.5" fill="none" />
            {/* Cozy blanket */}
            <Path
              d="M168 82 C194 76 224 78 248 96 H166 Z"
              fill={excellent ? '#942121' : '#3B322B'}
              stroke="#C89D49"
              strokeWidth="1.5"
            />
            {/* Floating Zzz */}
            <SvgText x="172" y="64" fill="#F1D899" fontSize="13" fontWeight="bold">
              Z
            </SvgText>
            <SvgText x="184" y="52" fill="#C89D49" fontSize="11" fontWeight="bold">
              z
            </SvgText>
            <SvgText x="194" y="42" fill="#8C8270" fontSize="9" fontWeight="bold">
              z
            </SvgText>
          </G>
        )}
      </Svg>
      {completed && (
        <View style={styles.pgReactionPill}>
          <Text style={styles.pgReactionText}>
            {excellent
              ? `${characterName} si addormenta subito al tepore perfetto delle braci.`
              : `${characterName} si stende sulla branda vicino al fuoco acceso.`}
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// 3. Armatura da ripulire (hygiene) Interactive Stage
// ============================================================================

export const GearWorkbenchScene: React.FC<{
  activeItem: GearItemId;
  stains: GearStain[];
  completed: boolean;
  excellent: boolean;
  characterName: string;
  onCleanStain: (stainId: string) => void;
}> = ({
  activeItem,
  stains,
  completed,
  excellent,
  characterName,
  onCleanStain,
}) => {
  const stageRef = useRef<React.ComponentRef<typeof View>>(null);
  const stageSizeRef = useRef({ width: 260, height: 156 });
  const stageOriginRef = useRef<{ x: number; y: number } | null>(null);
  const activeStains = useMemo(
    () => stains.filter((s) => s.itemId === activeItem),
    [stains, activeItem]
  );

  const stainsRef = useRef(activeStains);
  stainsRef.current = activeStains;
  const onCleanRef = useRef(onCleanStain);
  onCleanRef.current = onCleanStain;

  const checkScrubHit = (locationX: number, locationY: number) => {
    const { width, height } = stageSizeRef.current;
    if (width <= 0 || height <= 0) return;

    for (const stain of stainsRef.current) {
      if (stain.cleaned) continue;
      const cx = (stain.xPct / 100) * width;
      const cy = (stain.yPct / 100) * height;
      const dx = locationX - cx;
      const dy = locationY - cy;
      const hitRadius = Math.max(26, stain.radius + 10);
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        onCleanRef.current(stain.id);
      }
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !completed,
        onMoveShouldSetPanResponder: () => !completed,
        onMoveShouldSetPanResponderCapture: () => !completed,
        onPanResponderGrant: (evt) => {
          stageOriginRef.current = null;
          const { pageX, pageY } = evt.nativeEvent;
          stageRef.current?.measure((_x, _y, _width, _height, left, top) => {
            stageOriginRef.current = { x: left, y: top };
            checkScrubHit(pageX - left, pageY - top);
          });
        },
        onPanResponderMove: (evt) => {
          const origin = stageOriginRef.current;
          if (origin) {
            checkScrubHit(evt.nativeEvent.pageX - origin.x, evt.nativeEvent.pageY - origin.y);
          }
        },
      }),
    [completed]
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    stageSizeRef.current = { width, height };
  };

  return (
    <View style={styles.sceneFrame}>
      <View
        ref={stageRef}
        style={styles.gearStage}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height={156} viewBox="0 0 260 156" pointerEvents="none">
          <Rect x="0" y="0" width="260" height="156" rx="12" fill="#171412" />
          {/* Workbench wood grain */}
          <Rect x="10" y="122" width="240" height="24" rx="6" fill="#2A2018" />

          {activeItem === 'armor' && (
            <G>
              {/* Steel breastplate with brass trim */}
              <Path
                d="M84 26 L108 18 L130 28 L152 18 L176 26 L186 58 L170 124 L130 136 L90 124 L74 58 Z"
                fill="#475569"
                stroke="#C89D49"
                strokeWidth="2.5"
              />
              <Path
                d="M130 28 V134"
                stroke="#94A3B8"
                strokeWidth="2"
                opacity={0.7}
              />
              <Path
                d="M92 64 Q130 78 168 64"
                stroke="#C89D49"
                strokeWidth="2"
                fill="none"
              />
            </G>
          )}

          {activeItem === 'boots' && (
            <G>
              {/* Pair of leather boots */}
              <Path
                d="M66 32 H102 V92 L116 106 V122 H56 V104 L66 90 Z"
                fill="#5C3A21"
                stroke="#C89D49"
                strokeWidth="2.2"
              />
              <Path
                d="M158 32 H194 V90 L204 104 V122 H144 V106 L158 92 Z"
                fill="#5C3A21"
                stroke="#C89D49"
                strokeWidth="2.2"
              />
              <Rect x="64" y="42" width="40" height="8" rx="2" fill="#7E5F24" />
              <Rect x="156" y="42" width="40" height="8" rx="2" fill="#7E5F24" />
            </G>
          )}

          {activeItem === 'cloak' && (
            <G>
              {/* Adventurer cloak */}
              <Path
                d="M104 22 Q130 12 156 22 L192 128 Q130 140 68 128 Z"
                fill="#5B1B1B"
                stroke="#C89D49"
                strokeWidth="2.2"
              />
              <Path d="M130 24 L114 130" stroke="#3F1212" strokeWidth="2.5" />
              <Path d="M130 24 L148 130" stroke="#3F1212" strokeWidth="2.5" />
              {/* Brass clasp */}
              <Circle cx="130" cy="30" r="6" fill="#C89D49" stroke="#F1D899" strokeWidth="1.5" />
            </G>
          )}

          {/* Gleaming sparkles when completed */}
          {completed && (
            <G>
              <Circle cx="92" cy="40" r="3.5" fill="#F1D899" />
              <Circle cx="170" cy="48" r="3" fill="#38BDF8" />
              <Circle cx="136" cy="92" r="3.5" fill="#F1D899" />
              <Circle cx="164" cy="108" r="2.5" fill="#10B981" />
            </G>
          )}
        </Svg>

        {/* Interactive stains overlaid directly on the gear */}
        {!completed &&
          activeStains.map((stain, index) => {
            if (stain.cleaned) return null;
            const size = stain.radius * 2 + 6;
            return (
              <TouchableOpacity
                key={stain.id}
                onPress={() => onCleanStain(stain.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Pulisci macchia ${index + 1}`}
                style={[
                  styles.stainHitbox,
                  {
                    width: Math.max(44, size),
                    height: Math.max(44, size),
                    left: `${stain.xPct}%`,
                    top: `${stain.yPct}%`,
                    marginLeft: -Math.max(44, size) / 2,
                    marginTop: -Math.max(44, size) / 2,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stainBlob,
                    stain.kind === 'crust' && styles.stainCrustBlob,
                    {
                      width: size,
                      height: size * 0.82,
                      borderRadius: size / 2,
                    },
                  ]}
                >
                  <View style={styles.stainSpeck} />
                  {stain.kind === 'crust' && (
                    <Text style={styles.stainHitBadge}>{stain.hitsRemaining}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
      </View>

      {completed && (
        <View style={styles.pgReactionPill}>
          <Text style={styles.pgReactionText}>
            {excellent
              ? `${characterName}: «Armatura, stivali e mantello brillano come nuovi!»`
              : `${characterName}: «Molto meglio, pronto a ripartire.»`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sceneFrame: {
    gap: 8,
  },
  gearStage: {
    position: 'relative',
    width: '100%',
    maxWidth: 260,
    height: 156,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  stainHitbox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stainBlob: {
    backgroundColor: 'rgba(69, 44, 24, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(120, 80, 44, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stainCrustBlob: {
    backgroundColor: 'rgba(54, 30, 14, 0.98)',
    borderWidth: 2,
    borderColor: '#C89D49',
  },
  stainHitBadge: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '900',
    color: '#FDE68A',
  },
  stainSpeck: {
    width: 8,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(32, 20, 12, 0.75)',
  },
  pgReactionPill: {
    backgroundColor: 'rgba(200, 157, 73, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200, 157, 73, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pgReactionText: {
    fontSize: 12,
    color: colors.parchmentLight,
    textAlign: 'center',
    lineHeight: 17,
  },
});
