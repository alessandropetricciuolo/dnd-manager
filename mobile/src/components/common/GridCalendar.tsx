import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Crown,
  Sparkles,
  RotateCcw,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { CAMPAIGN_TYPE_BADGES, CAMPAIGN_TYPE_LABELS } from '../../contexts/CampaignContext';
import { CampaignType, PlayerSession, Session } from '../../types';

interface GridCalendarProps {
  sessions: (PlayerSession | Session)[];
  activeCampaignId?: string | null;
  onSelectSession?: (session: any) => void;
  onSignUp?: (session: any) => void;
  onCancelSignUp?: (session: any) => void;
  actionInProgressId?: string | null;
  isGmView?: boolean;
  onGmManageSession?: (session: any) => void;
  onGmCreateSession?: () => void;
}

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseSessionDateKey(scheduledAt: string): string {
  try {
    const d = new Date(scheduledAt);
    if (isNaN(d.getTime())) return '';
    return formatDateKey(d);
  } catch {
    return '';
  }
}

function formatSessionHours(scheduledAt: string): string {
  try {
    const d = new Date(scheduledAt);
    if (isNaN(d.getTime())) return '--:--';
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  } catch {
    return '--:--';
  }
}

export const GridCalendar: React.FC<GridCalendarProps> = ({
  sessions,
  activeCampaignId,
  onSelectSession,
  onSignUp,
  onCancelSignUp,
  actionInProgressId,
  isGmView = false,
  onGmManageSession,
  onGmCreateSession,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  // Map of dateKey -> sessions array
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, (PlayerSession | Session)[]>();
    for (const session of sessions) {
      if (!session.scheduled_at) continue;
      const key = parseSessionDateKey(session.scheduled_at);
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(session);
      map.set(key, list);
    }
    return map;
  }, [sessions]);

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDateKey(null);
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDateKey(null);
  };

  const handleResetToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(todayKey);
  };

  const monthLabel = useMemo(() => {
    const mStr = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    return mStr.charAt(0).toUpperCase() + mStr.slice(1);
  }, [currentDate]);

  // Build grid calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month (0 = Sun, 1 = Mon ... 6 = Sat)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // In Italian calendar Monday is 0:
    const startOffset = (firstDayIndex + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      dayNum: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      sessionCount: number;
      sessions: (PlayerSession | Session)[];
    }[] = [];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      const dateKey = formatDateKey(prevDate);
      const daySessions = sessionsByDate.get(dateKey) || [];
      days.push({
        dayNum: daysInPrevMonth - i,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        sessionCount: daySessions.length,
        sessions: daySessions,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const thisDate = new Date(year, month, day);
      const dateKey = formatDateKey(thisDate);
      const daySessions = sessionsByDate.get(dateKey) || [];
      days.push({
        dayNum: day,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        sessionCount: daySessions.length,
        sessions: daySessions,
      });
    }

    // Next month padding to fill grid to full weeks
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      const dateKey = formatDateKey(nextDate);
      const daySessions = sessionsByDate.get(dateKey) || [];
      days.push({
        dayNum: day,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        sessionCount: daySessions.length,
        sessions: daySessions,
      });
    }

    return days;
  }, [currentDate, sessionsByDate, todayKey]);

  // Total sessions in current month
  const currentMonthSessionsCount = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let count = 0;
    for (const [key, list] of sessionsByDate.entries()) {
      if (key.startsWith(prefix)) {
        count += list.length;
      }
    }
    return count;
  }, [currentDate, sessionsByDate]);

  // Selected Day sessions OR all month sessions if no day is selected
  const displayedSessions = useMemo(() => {
    if (selectedDateKey) {
      return sessionsByDate.get(selectedDateKey) || [];
    }
    // Return all sessions of the current month sorted chronologically
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const list: (PlayerSession | Session)[] = [];
    for (const [key, sList] of sessionsByDate.entries()) {
      if (key.startsWith(prefix)) {
        list.push(...sList);
      }
    }
    return list.sort((a, b) => (a.scheduled_at > b.scheduled_at ? 1 : -1));
  }, [selectedDateKey, sessionsByDate, currentDate]);

  const selectedDayFormatted = useMemo(() => {
    if (!selectedDateKey) return null;
    const parts = selectedDateKey.split('-');
    if (parts.length !== 3) return selectedDateKey;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [selectedDateKey]);

  return (
    <View style={styles.container}>
      {/* Calendar Month Navigation Bar */}
      <View style={styles.monthHeader}>
        <View style={styles.monthTitleWrapper}>
          <CalendarIcon size={16} color={colors.brassBase} />
          <Text style={styles.monthTitle}>{monthLabel}</Text>
          <View style={styles.sessionCountBadge}>
            <Text style={styles.sessionCountBadgeText}>{currentMonthSessionsCount} tavoli</Text>
          </View>
        </View>

        <View style={styles.navControls}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={handlePrevMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color={colors.parchmentLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.todayBtn}
            onPress={handleResetToday}
            activeOpacity={0.7}
          >
            <Text style={styles.todayBtnText}>Oggi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={handleNextMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <ChevronRight size={18} color={colors.parchmentLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday Labels (LUN .. DOM) */}
      <View style={styles.weekdayRow}>
        {WEEK_DAYS.map((day, idx) => (
          <View key={idx} style={styles.weekdayCell}>
            <Text
              style={[
                styles.weekdayText,
                (idx === 5 || idx === 6) && styles.weekdayWeekendText,
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid 7xN Cells */}
      <View style={styles.gridContainer}>
        {calendarDays.map((item, idx) => {
          const isSelected = item.dateKey === selectedDateKey;
          const hasSessions = item.sessionCount > 0;

          return (
            <TouchableOpacity
              key={`${item.dateKey}-${idx}`}
              style={[
                styles.dayCell,
                !item.isCurrentMonth && styles.dayCellOtherMonth,
                item.isToday && styles.dayCellToday,
                isSelected && styles.dayCellSelected,
              ]}
              onPress={() => {
                if (isSelected) {
                  setSelectedDateKey(null); // Deselect on second tap
                } else {
                  setSelectedDateKey(item.dateKey);
                }
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNumText,
                  !item.isCurrentMonth && styles.dayNumTextOtherMonth,
                  item.isToday && styles.dayNumTextToday,
                  isSelected && styles.dayNumTextSelected,
                ]}
              >
                {item.dayNum}
              </Text>

              {/* Session Indicators */}
              <View style={styles.dotsContainer}>
                {hasSessions ? (
                  item.sessionCount === 1 ? (
                    <View
                      style={[
                        styles.sessionDot,
                        isSelected && styles.sessionDotSelected,
                      ]}
                    />
                  ) : (
                    <View style={styles.multiDotRow}>
                      <View
                        style={[
                          styles.sessionDot,
                          isSelected && styles.sessionDotSelected,
                        ]}
                      />
                      <View
                        style={[
                          styles.sessionDot,
                          { backgroundColor: colors.brassLight },
                          isSelected && styles.sessionDotSelected,
                        ]}
                      />
                    </View>
                  )
                ) : (
                  <View style={styles.emptyDotPlaceholder} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Detail Section: List of Sessions for Selected Date or Current Month */}
      <View style={styles.sessionListHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sessionListTitle}>
            {selectedDateKey
              ? `Sessioni di ${selectedDayFormatted}`
              : `Tutte le Sessioni di ${monthLabel}`}
          </Text>
          <Text style={styles.sessionListSub}>
            {selectedDateKey
              ? `${displayedSessions.length} sessione/i in questo giorno`
              : `Tocca un giorno sul calendario per filtrare`}
          </Text>
        </View>

        {selectedDateKey && (
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={() => setSelectedDateKey(null)}
            activeOpacity={0.7}
          >
            <RotateCcw size={11} color={colors.brassLight} />
            <Text style={styles.clearFilterText}>Tutto il mese</Text>
          </TouchableOpacity>
        )}

        {isGmView && onGmCreateSession && (
          <TouchableOpacity
            style={styles.gmCreatePillBtn}
            onPress={onGmCreateSession}
            activeOpacity={0.8}
          >
            <Text style={styles.gmCreatePillText}>+ Crea Tavolo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Render Sessions Cards */}
      {displayedSessions.length === 0 ? (
        <View style={styles.emptyDayBox}>
          <CalendarIcon size={22} color={colors.parchmentMuted} />
          <Text style={styles.emptyDayText}>
            {selectedDateKey
              ? 'Nessuna sessione programmata per questo giorno.'
              : `Nessuna sessione trovata per il mese di ${monthLabel}.`}
          </Text>
          {selectedDateKey && (
            <TouchableOpacity
              style={styles.showAllBtn}
              onPress={() => setSelectedDateKey(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.showAllBtnText}>Mostra tutte le sessioni del mese</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        displayedSessions.map((session) => {
          const s = session as any;
          const campName = s.campaigns?.name || s.campaignName || 'Campagna di Gilda';
          const campType: CampaignType = s.campaigns?.type || 'quest';
          const badgeMeta = CAMPAIGN_TYPE_BADGES[campType] || CAMPAIGN_TYPE_BADGES.quest;
          const timeStr = formatSessionHours(s.scheduled_at);
          const isBusy = actionInProgressId === s.id;
          const isCurrentActiveCampaign = activeCampaignId && s.campaign_id === activeCampaignId;

          // Player specific properties
          const isConfirmed = !!s.isConfirmed;
          const isFull = !!s.isFull;
          const confirmedCount = s.confirmedCount ?? (s.signups ? s.signups.length : 0);
          const maxPlayers = s.max_players ?? 6;

          return (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.sessionCard,
                isCurrentActiveCampaign && styles.sessionCardCurrentCamp,
              ]}
              onPress={() => {
                if (onSelectSession) onSelectSession(s);
              }}
              activeOpacity={0.85}
            >
              {/* Top Row: Campaign Badge + Time Badge */}
              <View style={styles.sessionCardTop}>
                <View style={styles.campBadgeWrapper}>
                  <View
                    style={[
                      styles.typePill,
                      { backgroundColor: badgeMeta.bg, borderColor: badgeMeta.border },
                    ]}
                  >
                    <Text style={[styles.typePillText, { color: badgeMeta.text }]}>
                      {badgeMeta.label}
                    </Text>
                  </View>
                  <Text style={styles.campNameText} numberOfLines={1}>
                    {campName}
                  </Text>
                </View>

                <View style={styles.timeBadge}>
                  <Clock size={11} color={colors.brassLight} />
                  <Text style={styles.timeBadgeText}>{timeStr}</Text>
                </View>
              </View>

              {/* Title & Location */}
              <Text style={styles.sessionTitle} numberOfLines={2}>
                {s.title || 'Sessione Ufficiale al Tavolo'}
              </Text>

              <View style={styles.locationRow}>
                <MapPin size={12} color={colors.parchmentMuted} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {s.location || 'Barber & Dragons · Tavolo Taverna'}
                </Text>
              </View>

              {/* Footer: Occupancy and Action Buttons */}
              <View style={styles.sessionCardFooter}>
                <View style={styles.occupancyBox}>
                  <Users size={12} color={colors.brassLight} />
                  <Text style={styles.occupancyText}>
                    {confirmedCount}/{maxPlayers} giocatori
                  </Text>
                </View>

                {/* Actions depending on Player or GM view */}
                <View style={styles.actionsBox}>
                  {isGmView ? (
                    <TouchableOpacity
                      style={styles.gmManageBtn}
                      onPress={() => {
                        if (onGmManageSession) onGmManageSession(s);
                        else if (onSelectSession) onSelectSession(s);
                      }}
                      activeOpacity={0.8}
                    >
                      <Crown size={12} color={colors.void} />
                      <Text style={styles.gmManageBtnText}>Gestisci Tavolo</Text>
                    </TouchableOpacity>
                  ) : isBusy ? (
                    <ActivityIndicator size="small" color={colors.brassBase} />
                  ) : isConfirmed ? (
                    <TouchableOpacity
                      style={styles.confirmedBtn}
                      onPress={() => {
                        if (onCancelSignUp) onCancelSignUp(s);
                      }}
                      activeOpacity={0.8}
                    >
                      <CheckCircle2 size={12} color={colors.emerald} />
                      <Text style={styles.confirmedBtnText}>Iscritto (Tocca per rinunciare)</Text>
                    </TouchableOpacity>
                  ) : isFull ? (
                    <View style={styles.fullBadge}>
                      <Text style={styles.fullBadgeText}>Tavolo al Completo</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.signUpBtn}
                      onPress={() => {
                        if (onSignUp) onSignUp(s);
                        else if (onSelectSession) onSelectSession(s);
                      }}
                      activeOpacity={0.8}
                    >
                      <Sparkles size={12} color={colors.void} />
                      <Text style={styles.signUpBtnText}>Prenota Posto</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.stoneBorder,
    padding: 12,
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.parchmentLight,
    letterSpacing: 0.5,
  },
  sessionCountBadge: {
    backgroundColor: colors.stone,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brassDark,
  },
  sessionCountBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.brassLight,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  todayBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekdayWeekendText: {
    color: colors.brassLight,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRadius: 8,
  },
  dayCellOtherMonth: {
    opacity: 0.3,
  },
  dayCellToday: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderWidth: 1,
    borderColor: colors.brassDark,
  },
  dayCellSelected: {
    backgroundColor: colors.brassBase,
  },
  dayNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  dayNumTextOtherMonth: {
    color: colors.parchmentMuted,
  },
  dayNumTextToday: {
    color: colors.brassLight,
    fontWeight: '900',
  },
  dayNumTextSelected: {
    color: colors.void,
    fontWeight: '900',
  },
  dotsContainer: {
    height: 6,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.emerald,
  },
  sessionDotSelected: {
    backgroundColor: colors.void,
  },
  multiDotRow: {
    flexDirection: 'row',
    gap: 2,
  },
  emptyDotPlaceholder: {
    width: 4,
    height: 4,
  },
  sessionListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 12,
    marginBottom: 10,
  },
  sessionListTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.brassLight,
    textTransform: 'capitalize',
  },
  sessionListSub: {
    fontSize: 10,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  clearFilterText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.brassLight,
  },
  gmCreatePillBtn: {
    backgroundColor: colors.brassBase,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  gmCreatePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.void,
  },
  emptyDayBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: colors.stone,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    gap: 6,
  },
  emptyDayText: {
    fontSize: 11,
    color: colors.parchmentMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  showAllBtn: {
    backgroundColor: colors.stoneSurface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.brassDark,
    marginTop: 4,
  },
  showAllBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  sessionCard: {
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    marginBottom: 8,
  },
  sessionCardCurrentCamp: {
    borderColor: colors.brassBase,
    backgroundColor: 'rgba(217, 119, 6, 0.06)',
  },
  sessionCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  campBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  campNameText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentLight,
    flex: 1,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.stoneSurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 10,
    color: colors.parchmentMuted,
  },
  sessionCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 8,
  },
  occupancyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  occupancyText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  actionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  signUpBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.void,
  },
  confirmedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: colors.emerald,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confirmedBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.emerald,
  },
  fullBadge: {
    backgroundColor: colors.stoneSurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  fullBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  gmManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  gmManageBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.void,
  },
});

export default GridCalendar;
