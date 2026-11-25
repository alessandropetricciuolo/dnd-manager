import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Flame, Moon, Sparkles, Shield, Utensils } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import {
  CARE_TROPHY_META,
  NonDiceCareStat,
  TamagotchiAction,
  TamagotchiAppearance,
  TamagotchiMood,
} from '../../lib/character-tamagotchi';
import {
  SpritePose,
  buildCharacterSpritePalette,
  deriveAutonomousBehavior,
  moodToDefaultPose,
  poseForAction,
  resolveClassArchetype,
  resolveRaceTrait,
} from '../../lib/retro-sprite';
import { resolveImageUrl } from '../../utils/imageUrl';
import { RetroTamagotchiSprite } from './RetroTamagotchiSprite';
import { BrassDieTrophy } from './InnkeeperSprite';

interface TamagotchiStageProps {
  characterName: string;
  characterClass?: string | null;
  raceSlug?: string | null;
  imageUrl: string | null;
  lowpolyAvatarUrl?: string | null;
  appearance?: TamagotchiAppearance | null;
  mood: TamagotchiMood;
  moodLabel: string;
  stats: {
    hunger: number;
    happiness: number;
    energy: number;
    hygiene: number;
  };
  activeBurst: TamagotchiAction | null;
  hasInnkeeperTrophy?: boolean;
  unlockedCareTrophies?: Partial<Record<NonDiceCareStat, string>>;
  onTapHero: () => void;
  onOpenMirror?: () => void;
  onOpenChest?: () => void;
}

const BURST_EMOJI: Record<TamagotchiAction, string> = {
  feed: '🍖',
  play: '🎲',
  rest: '💤',
  clean: '✨',
  pet: '❤️',
};

/**
 * 36x48 HD Pixel-Art Ornate Tavern Mirror (clickable prop for physical traits).
 */
const TavernMirrorProp: React.FC<{ gleamTick: boolean }> = ({ gleamTick }) => (
  <Svg width={38} height={50} viewBox="0 0 36 48">
    {/* Outer shadow & arched dark outline */}
    <Rect x={6} y={1} width={24} height={4} fill="#120D0A" />
    <Rect x={3} y={4} width={30} height={42} fill="#120D0A" />
    {/* Carved brass frame & rivets */}
    <Rect x={8} y={3} width={20} height={3} fill="#F5C451" />
    <Rect x={5} y={6} width={26} height={38} fill="#B4861E" />
    <Rect x={5} y={6} width={3} height={38} fill="#F5C451" />
    <Rect x={6} y={41} width={24} height={3} fill="#78530D" />
    {/* Beveled reflective glass */}
    <Rect x={9} y={9} width={18} height={31} fill="#1E293B" />
    <Rect x={11} y={11} width={14} height={27} fill="#334155" />
    {/* Animated diagonal shimmer */}
    <Rect x={12} y={gleamTick ? 12 : 14} width={5} height={13} fill="#38BDF8" />
    <Rect x={18} y={gleamTick ? 26 : 24} width={4} height={8} fill="#38BDF8" />
    <Rect x={13} y={gleamTick ? 14 : 16} width={3} height={7} fill="#E0F2FE" />
  </Svg>
);

/**
 * 48x38 HD Pixel-Art Iron & Brass Adventurer's Chest (clickable prop for outfits & weapons).
 */
const TavernChestProp: React.FC = () => (
  <Svg width={52} height={42} viewBox="0 0 48 38">
    {/* Ground shadow */}
    <Rect x={2} y={34} width={44} height={4} fill="rgba(0,0,0,0.5)" />
    {/* Outline */}
    <Rect x={5} y={2} width={38} height={4} fill="#120D0A" />
    <Rect x={3} y={5} width={42} height={30} fill="#120D0A" />
    {/* Domed oak lid */}
    <Rect x={6} y={5} width={36} height={11} fill="#8C5230" />
    <Rect x={7} y={5} width={34} height={4} fill="#AD6A42" />
    {/* Chest base with plank seam */}
    <Rect x={6} y={18} width={36} height={15} fill="#5C341D" />
    <Rect x={6} y={25} width={36} height={2} fill="#3E2212" />
    {/* Crimson cape corner peeking out */}
    <Rect x={34} y={16} width={6} height={5} fill="#DC2626" />
    {/* Riveted brass straps & lockplate */}
    <Rect x={11} y={5} width={5} height={28} fill="#D99B26" />
    <Rect x={32} y={5} width={5} height={28} fill="#D99B26" />
    <Rect x={20} y={13} width={8} height={10} fill="#FACC15" />
    <Rect x={23} y={16} width={2} height={4} fill="#120D0A" />
  </Svg>
);

export const TamagotchiStage: React.FC<TamagotchiStageProps> = ({
  characterName,
  characterClass,
  raceSlug,
  imageUrl,
  lowpolyAvatarUrl,
  appearance,
  mood,
  moodLabel,
  stats,
  activeBurst,
  hasInnkeeperTrophy = false,
  unlockedCareTrophies,
  onTapHero,
  onOpenMirror,
  onOpenChest,
}) => {
  const posX = useRef(new Animated.Value(0)).current;
  const posY = useRef(new Animated.Value(0)).current;
  const tapScale = useRef(new Animated.Value(1)).current;
  const burstAnim = useRef(new Animated.Value(0)).current;

  const currentXRef = useRef(0);
  const [frame, setFrame] = useState(0);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [isWalking, setIsWalking] = useState(false);
  const [isAutonomousRest, setIsAutonomousRest] = useState(false);
  const [showThought, setShowThought] = useState(false);

  const archetype = useMemo(() => resolveClassArchetype(characterClass), [characterClass]);
  const race = useMemo(() => resolveRaceTrait(raceSlug), [raceSlug]);
  const palette = useMemo(
    () =>
      buildCharacterSpritePalette({
        characterName,
        imageUrl: lowpolyAvatarUrl || imageUrl,
        characterClass,
        raceSlug,
        appearance,
      }),
    [characterName, lowpolyAvatarUrl, imageUrl, characterClass, raceSlug, appearance]
  );

  const behavior = useMemo(() => deriveAutonomousBehavior(stats), [stats]);

  // 380ms 48x48 sprite frame ticker
  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % 8);
    }, 380);
    return () => clearInterval(id);
  }, []);

  // Autonomous wandering & need-driven movement loop (keeps center clear of Mirror & Chest)
  useEffect(() => {
    if (activeBurst) {
      setIsWalking(false);
      setIsAutonomousRest(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleStep = (delayMs: number) => {
      timer = setTimeout(() => {
        if (cancelled) return;

        if (behavior.restChance > 0 && Math.random() < behavior.restChance) {
          setIsWalking(false);
          setIsAutonomousRest(true);
          setShowThought(true);
          scheduleStep(behavior.pauseMs);
          return;
        }

        setIsAutonomousRest(false);
        const shouldWalk = Math.random() < (behavior.urgentNeed === 'hunger' ? 0.85 : 0.7);

        if (shouldWalk) {
          // Keep hero between Specchio (left) and Baule (right)
          const targetX = Math.round(Math.random() * 80 - 40);
          const delta = targetX - currentXRef.current;
          if (Math.abs(delta) > 6) {
            setFacing(delta >= 0 ? 'right' : 'left');
            setIsWalking(true);
            setShowThought(Boolean(behavior.thoughtText) && Math.random() < 0.65);

            const duration = Math.max(
              550,
              Math.round((Math.abs(delta) / 96) * behavior.paceMs)
            );

            Animated.timing(posX, {
              toValue: targetX,
              duration,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (!cancelled && finished) {
                currentXRef.current = targetX;
                setIsWalking(false);
                scheduleStep(behavior.pauseMs);
              }
            });
            return;
          }
        }

        setIsWalking(false);
        setShowThought(Boolean(behavior.thoughtText));
        if (behavior.jittery) {
          Animated.sequence([
            Animated.timing(posY, { toValue: -5, duration: 130, useNativeDriver: true }),
            Animated.timing(posY, { toValue: 0, duration: 130, useNativeDriver: true }),
          ]).start();
        }
        scheduleStep(behavior.pauseMs);
      }, delayMs);
    };

    scheduleStep(450);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeBurst, behavior, posX, posY]);

  useEffect(() => {
    if (!activeBurst) return;
    burstAnim.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(posY, { toValue: -10, duration: 160, useNativeDriver: true }),
        Animated.spring(posY, { toValue: 0, friction: 4, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.spring(tapScale, { toValue: 1.1, useNativeDriver: true }),
        Animated.spring(tapScale, { toValue: 1, useNativeDriver: true }),
      ]),
      Animated.timing(burstAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeBurst, burstAnim, posY, tapScale]);

  const activePose: SpritePose = useMemo(() => {
    const actionPose = poseForAction(activeBurst, frame);
    if (actionPose) return actionPose;
    if (isWalking) return frame % 2 === 0 ? 'walk_a' : 'walk_b';
    if (isAutonomousRest) return 'rest';
    return moodToDefaultPose(mood, frame);
  }, [activeBurst, frame, isWalking, isAutonomousRest, mood]);

  const resolvedAvatar = resolveImageUrl(lowpolyAvatarUrl || imageUrl);
  const isRestingMood = mood === 'assonnato' || isAutonomousRest || activeBurst === 'rest';

  const burstTranslateY = burstAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -34],
  });
  const burstOpacity = burstAnim.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  const flameTick = frame % 2 === 0;

  return (
    <View style={[styles.screen, isRestingMood && styles.screenNight]}>
      {/* Tavern Ambient Header */}
      <View style={styles.sceneTopRow}>
        <View style={styles.sceneLocationBadge}>
          {isRestingMood ? (
            <Moon size={12} color={colors.brassLight} />
          ) : (
            <Flame size={12} color={colors.brassBase} />
          )}
          <Text style={styles.sceneLocationText}>
            {isRestingMood ? 'LOCANDA · NOTTE' : 'TAVERNA · 48×48'}
          </Text>
        </View>

        <View style={styles.moodPill}>
          <Sparkles size={11} color={colors.void} />
          <Text style={styles.moodPillText}>{moodLabel.toUpperCase()}</Text>
        </View>
      </View>

      {/* High-Density 48x48-Scale Tavern Stage */}
      <View style={styles.stageCenter}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 195 120"
          preserveAspectRatio="xMidYMax slice"
          style={styles.pixelBackdrop}
        >
          {/* Warm torch ambient wall halo */}
          {!isRestingMood && (
            <Rect x={2} y={16} width={38} height={48} fill="rgba(249, 115, 22, 0.07)" />
          )}

          {/* Carved oak wainscoting with vertical plank seams */}
          <Rect x={0} y={72} width={195} height={12} fill="#2A1F18" />
          <Rect x={0} y={72} width={195} height={2} fill="#3E2D22" />
          <Rect x={18} y={74} width={1.5} height={10} fill="#1E1510" />
          <Rect x={42} y={74} width={1.5} height={10} fill="#1E1510" />
          <Rect x={66} y={74} width={1.5} height={10} fill="#1E1510" />
          <Rect x={90} y={74} width={1.5} height={10} fill="#1E1510" />
          <Rect x={114} y={74} width={1.5} height={10} fill="#1E1510" />
          <Rect x={138} y={74} width={1.5} height={10} fill="#1E1510" />
          <Rect x={162} y={74} width={1.5} height={10} fill="#1E1510" />

          {/* Stone flagstone floor */}
          <Rect x={0} y={84} width={195} height={36} fill="#1E1712" />
          <Rect x={0} y={84} width={195} height={2} fill="#3B2D22" />
          <Rect x={12} y={95} width={26} height={2} fill="#2A2019" />
          <Rect x={62} y={104} width={32} height={2} fill="#2A2019" />
          <Rect x={124} y={93} width={28} height={2} fill="#2A2019" />
          <Rect x={156} y={108} width={22} height={2} fill="#2A2019" />

          {/* Left Wall Iron-Bracketed Torch */}
          <Rect x={15} y={42} width={5} height={22} fill="#5C3D28" />
          <Rect x={12} y={39} width={11} height={5} fill="#3E2723" />
          <Rect x={14} y={flameTick ? 29 : 27} width={7} height={11} fill="#EA580C" />
          <Rect x={15.5} y={flameTick ? 32 : 30} width={4} height={7} fill="#FACC15" />
          <Rect x={16.5} y={flameTick ? 34 : 32} width={2} height={4} fill="#FEF08A" />

          {/* Right Tavern Paned Window */}
          <Rect x={153} y={17} width={28} height={31} fill="#120D0A" />
          <Rect x={155} y={19} width={24} height={27} fill="#3E2723" />
          <Rect
            x={158}
            y={22}
            width={18}
            height={21}
            fill={isRestingMood ? '#0F172A' : '#451A03'}
          />
          {isRestingMood ? (
            <>
              <Rect x={161} y={25} width={2} height={2} fill="#FDE047" />
              <Rect x={171} y={29} width={2} height={2} fill="#E2E8F0" />
              <Rect x={163} y={36} width={1.5} height={1.5} fill="#BAE6FD" />
            </>
          ) : (
            <Rect x={160} y={26} width={14} height={12} fill="#92400E" />
          )}
          <Rect x={166} y={22} width={2} height={21} fill="#3E2723" />
          <Rect x={158} y={32} width={18} height={2} fill="#3E2723" />
        </Svg>

        {/* Mini PG Portrait Badge in top-left */}
        {resolvedAvatar ? (
          <View style={styles.miniPortraitBox}>
            <Image
              source={{ uri: resolvedAvatar }}
              style={styles.miniPortraitImg}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={styles.miniPortraitBox}>
            <Shield size={14} color={colors.brassLight} />
          </View>
        )}

        {/* Trophy Shelf in top-right */}
        {(hasInnkeeperTrophy ||
          Boolean(unlockedCareTrophies?.hunger) ||
          Boolean(unlockedCareTrophies?.energy) ||
          Boolean(unlockedCareTrophies?.hygiene)) && (
          <View style={styles.trophyShelf}>
            {hasInnkeeperTrophy && (
              <View
                style={[styles.miniPortraitBox, styles.trophyShelfItem]}
                accessible
                accessibilityRole="image"
                accessibilityLabel="Dado d’Ottone conquistato"
              >
                <BrassDieTrophy size={22} />
              </View>
            )}
            {unlockedCareTrophies?.hunger && (
              <View
                style={[styles.miniPortraitBox, styles.trophyShelfItem]}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${CARE_TROPHY_META.hunger.name} conquistato`}
              >
                <Utensils size={14} color={colors.brassLight} />
              </View>
            )}
            {unlockedCareTrophies?.energy && (
              <View
                style={[styles.miniPortraitBox, styles.trophyShelfItem]}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${CARE_TROPHY_META.energy.name} conquistato`}
              >
                <Flame size={14} color={colors.brassLight} />
              </View>
            )}
            {unlockedCareTrophies?.hygiene && (
              <View
                style={[styles.miniPortraitBox, styles.trophyShelfItem]}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${CARE_TROPHY_META.hygiene.name} conquistato`}
              >
                <Sparkles size={14} color={colors.brassLight} />
              </View>
            )}
          </View>
        )}

        {/* Left Wall Interactive Mirror (Specchio: Volto, Pelle, Occhi, Capelli) */}
        {onOpenMirror && (
          <TouchableOpacity
            style={styles.mirrorTouch}
            onPress={onOpenMirror}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Apri lo Specchio per personalizzare volto, pelle e capelli di ${characterName}`}
          >
            <TavernMirrorProp gleamTick={flameTick} />
            <View style={styles.propLabelPill}>
              <Text style={styles.propLabelText}>SPECCHIO</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Right Floor Interactive Chest (Baule: Vestiti, Mantelli, Armi, Accessori) */}
        {onOpenChest && (
          <TouchableOpacity
            style={styles.chestTouch}
            onPress={onOpenChest}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Apri il Baule per personalizzare vestiti, armi e accessori di ${characterName}`}
          >
            <TavernChestProp />
            <View style={styles.propLabelPill}>
              <Text style={styles.propLabelText}>BAULE</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Animated 48x48 Hero Sprite + Shadow + Thought/Burst */}
        <Animated.View
          style={[
            styles.heroMover,
            {
              transform: [{ translateX: posX }],
            },
          ]}
        >
          {activeBurst && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.burstBadge,
                {
                  opacity: burstOpacity,
                  transform: [{ translateY: burstTranslateY }],
                },
              ]}
            >
              <Text style={styles.burstEmoji}>{BURST_EMOJI[activeBurst]}</Text>
            </Animated.View>
          )}

          {!activeBurst && showThought && behavior.thoughtText && (
            <View style={styles.thoughtBubble}>
              <Text style={styles.thoughtText}>{behavior.thoughtText}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={onTapHero}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Incoraggia ${characterName}`}
          >
            <Animated.View
              style={{
                transform: [{ translateY: posY }, { scale: tapScale }],
              }}
            >
              <RetroTamagotchiSprite
                palette={palette}
                archetype={archetype}
                race={race}
                pose={activePose}
                facing={facing}
                size={132}
                appearance={appearance}
                frame={frame}
              />
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.pixelShadow} />
        </Animated.View>
      </View>

      <Text style={styles.tapHint}>
        Tocca {characterName.split(' ')[0]} per incoraggiarlo · Specchio e Baule per personalizzare
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#17120E',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
  },
  screenNight: {
    backgroundColor: '#0E1018',
  },
  sceneTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sceneLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sceneLocationText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 0.6,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  moodPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.void,
    letterSpacing: 0.5,
  },
  stageCenter: {
    flex: 1,
    width: '100%',
    minHeight: 214,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.22)',
    backgroundColor: '#140F0C',
  },
  pixelBackdrop: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  miniPortraitBox: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 34,
    height: 34,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    backgroundColor: colors.stoneSurface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  miniPortraitImg: {
    width: '100%',
    height: '100%',
  },
  mirrorTouch: {
    position: 'absolute',
    left: 10,
    bottom: 54,
    minWidth: 52,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 6,
  },
  chestTouch: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    minWidth: 60,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 6,
  },
  propLabelPill: {
    backgroundColor: 'rgba(18, 13, 10, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.42)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  propLabelText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: colors.brassLight,
    letterSpacing: 0.5,
  },
  heroMover: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 4,
  },
  trophyShelf: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
    zIndex: 6,
  },
  trophyShelfItem: {
    position: 'relative',
    top: undefined,
    left: undefined,
  },
  pixelShadow: {
    width: 58,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    marginTop: -6,
  },
  thoughtBubble: {
    marginBottom: 2,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#120D0A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  thoughtText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#120D0A',
  },
  burstBadge: {
    position: 'absolute',
    top: -14,
    zIndex: 10,
    backgroundColor: 'rgba(20, 15, 11, 0.85)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.brassLight,
  },
  burstEmoji: {
    fontSize: 18,
  },
  tapHint: {
    marginTop: 8,
    fontSize: 11,
    color: colors.parchmentMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
});
