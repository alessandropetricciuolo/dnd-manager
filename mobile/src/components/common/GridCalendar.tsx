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
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Crown,
  Sparkles,
  RotateCcw,
  ListFilter,
  CalendarDays,
  List,
  AlertCircle,
  Hourglass,
  SlidersHorizontal,
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
  onPlayerOpenSession?: (session: any) => void;
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

function formatSessionDuration(durationHours?: number | null): string {
  if (!durationHours) return '3h 30m';
  const h = Math.floor(durationHours);
  const m = Math.round((durationHours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatFullDateItalian(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const str = d.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  } catch {
    return dateStr;
  }
}

const SESSION_DOT_COLORS = {
  oneshot: '#22C55E', // Verde per One Shot
  long: '#FACC15',    // Giallo per Campagna Long
  quest: '#A855F7',   // Viola per Quest
  past: '#EF4444',    // Rosso per Sessione Passata
} as const;

function isSessionPast(session: any, todayKey: string): boolean {
  if (!session) return false;
  if (session.status === 'completed' || session.status === 'cancelled') {
    return true;
  }
  if (!session.scheduled_at) return false;
  const sessionDateKey = parseSessionDateKey(session.scheduled_at);
  if (sessionDateKey && sessionDateKey < todayKey) {
    return true;
  }
  const scheduledMs = new Date(session.scheduled_at).getTime();
  if (!isNaN(scheduledMs) && scheduledMs < Date.now()) {
    return true;
  }
  return false;
}

function getSessionDotColor(session: any, todayKey: string): string {
  if (isSessionPast(session, todayKey)) {
    return SESSION_DOT_COLORS.past;
  }
  const rawType = String(session?.campaigns?.type || session?.campaign_type || 'quest').toLowerCase();
  if (rawType === 'oneshot') return SESSION_DOT_COLORS.oneshot;
  if (rawType === 'long') return SESSION_DOT_COLORS.long;
  if (rawType === 'quest') return SESSION_DOT_COLORS.quest;
  return SESSION_DOT_COLORS.quest;
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
  onPlayerOpenSession,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [filterOnlyOpen, setFilterOnlyOpen] = useState<boolean>(false);

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isListExpanded, setIsListExpanded] = useState<boolean>(false);

  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  // Filter sessions (e.g. only open for registration or scheduled)
  const availableSessions = useMemo(() => {
    let list = [...sessions];
    if (filterOnlyOpen) {
      list = list.filter((s) => s.status === 'scheduled');
    }
    return list;
  }, [sessions, filterOnlyOpen]);

  // Map of dateKey -> sessions array
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, (PlayerSession | Session)[]>();
    for (const session of availableSessions) {
      if (!session.scheduled_at) continue;
      const key = parseSessionDateKey(session.scheduled_at);
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(session);
      map.set(key, list);
    }
    return map;
  }, [availableSessions]);

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

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startOffset = (firstDayIndex + 6) % 7; // Monday is 0

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      dayNum: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      sessionCount: number;
      sessionsOnDay: (PlayerSession | Session)[];
    }[] = [];

    // Previous month filler days
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const dateKey = formatDateKey(d);
      const sList = sessionsByDate.get(dateKey) || [];
      days.push({
        dayNum,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        sessionCount: sList.length,
        sessionsOnDay: sList,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateKey = formatDateKey(dateObj);
      const sList = sessionsByDate.get(dateKey) || [];
      days.push({
        dayNum: d,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        sessionCount: sList.length,
        sessionsOnDay: sList,
      });
    }

    // Next month filler days to complete rows (multiple of 7)
    const remainder = days.length % 7;
    if (remainder > 0) {
      const toAdd = 7 - remainder;
      for (let d = 1; d <= toAdd; d++) {
        const dateObj = new Date(year, month + 1, d);
        const dateKey = formatDateKey(dateObj);
        const sList = sessionsByDate.get(dateKey) || [];
        days.push({
          dayNum: d,
          dateKey,
          isCurrentMonth: false,
          isToday: dateKey === todayKey,
          sessionCount: sList.length,
          sessionsOnDay: sList,
        });
      }
    }

    return days;
  }, [currentDate, sessionsByDate, todayKey]);

  // Current month sessions count
  const currentMonthSessionsCount = useMemo(() => {
    let count = 0;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    for (const session of availableSessions) {
      if (!session.scheduled_at) continue;
      const d = new Date(session.scheduled_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        count++;
      }
    }
    return count;
  }, [availableSessions, currentDate]);

  // Sessions to display below the grid (selected day or upcoming in current/selected month)
  const displayedSessions = useMemo(() => {
    if (selectedDateKey) {
      return sessionsByDate.get(selectedDateKey) || [];
    }
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const isCurrentRealMonth = year === now.getFullYear() && month === now.getMonth();

    return availableSessions
      .filter((s) => {
        if (!s.scheduled_at) return false;
        const d = new Date(s.scheduled_at);
        if (d.getFullYear() !== year || d.getMonth() !== month) return false;
        // When viewing current month, exclude past sessions (before today)
        if (isCurrentRealMonth && d.getTime() < startOfToday) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.scheduled_at > b.scheduled_at ? 1 : -1));
  }, [selectedDateKey, sessionsByDate, availableSessions, currentDate]);

  // All upcoming sessions for Agenda View (Google Calendar Schedule mode)
  const upcomingAgendaSessions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const list = availableSessions
      .filter((s) => s.scheduled_at && new Date(s.scheduled_at).getTime() >= startOfToday)
      .sort((a, b) => (a.scheduled_at > b.scheduled_at ? 1 : -1));
    // Group by date
    const groups: { dateKey: string; dateTitle: string; items: (PlayerSession | Session)[] }[] = [];
    for (const s of list) {
      if (!s.scheduled_at) continue;
      const k = parseSessionDateKey(s.scheduled_at);
      let g = groups.find((x) => x.dateKey === k);
      if (!g) {
        g = { dateKey: k, dateTitle: formatFullDateItalian(s.scheduled_at), items: [] };
        groups.push(g);
      }
      g.items.push(s);
    }
    return groups;
  }, [availableSessions]);

  const selectedDayFormatted = useMemo(() => {
    if (!selectedDateKey) return null;
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [selectedDateKey]);

  const handleSessionCardTap = (session: any) => {
    if (isGmView) {
      if (onGmManageSession) {
        onGmManageSession(session);
      } else if (onSelectSession) {
        onSelectSession(session);
      }
    } else {
      if (onPlayerOpenSession) {
        onPlayerOpenSession(session);
      } else if (onSelectSession) {
        onSelectSession(session);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar: Month Navigation & Google Calendar Mode Switcher */}
      <View style={styles.topControlRow}>
        <View style={styles.monthTitleWrapper}>
          <CalendarIcon size={16} color={colors.brassBase} />
          <Text style={styles.monthTitle}>{monthLabel}</Text>
          <View style={styles.sessionCountBadge}>
            <Text style={styles.sessionCountBadgeText}>{currentMonthSessionsCount} tavoli</Text>
          </View>
        </View>

        {/* View Switcher: Mese (Grid) vs Programma (Agenda) */}
        <View style={styles.viewSwitcher}>
          <TouchableOpacity
            style={[styles.viewSwitchBtn, viewMode === 'month' && styles.viewSwitchBtnActive]}
            onPress={() => setViewMode('month')}
            activeOpacity={0.7}
          >
            <CalendarDays size={13} color={viewMode === 'month' ? colors.void : colors.parchmentMuted} />
            <Text style={[styles.viewSwitchText, viewMode === 'month' && styles.viewSwitchTextActive]}>
              Mese
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewSwitchBtn, viewMode === 'agenda' && styles.viewSwitchBtnActive]}
            onPress={() => setViewMode('agenda')}
            activeOpacity={0.7}
          >
            <List size={13} color={viewMode === 'agenda' ? colors.void : colors.parchmentMuted} />
            <Text style={[styles.viewSwitchText, viewMode === 'agenda' && styles.viewSwitchTextActive]}>
              Programma
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Secondary Row: Navigation Controls & Quick Filters */}
      <View style={styles.subControlRow}>
        <View style={styles.navControls}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={handlePrevMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={16} color={colors.parchmentLight} />
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
            <ChevronRight size={16} color={colors.parchmentLight} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.filterToggleBtn, filterOnlyOpen && styles.filterToggleBtnActive]}
          onPress={() => setFilterOnlyOpen((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Sparkles size={11} color={filterOnlyOpen ? colors.void : colors.brassLight} />
          <Text style={[styles.filterToggleText, filterOnlyOpen && styles.filterToggleTextActive]}>
            {filterOnlyOpen ? 'Solo Aperte' : 'Tutti i Tavoli'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= MODE 1: GOOGLE CALENDAR MONTH GRID ================= */}
      {viewMode === 'month' && (
        <>
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
                      setSelectedDateKey(null);
                    } else {
                      setSelectedDateKey(item.dateKey);
                      setIsListExpanded(true);
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

                  {/* Google Calendar event dot / pill indicator */}
                  <View style={styles.dotsContainer}>
                    {hasSessions ? (
                      <View style={styles.gCalEventBadge}>
                        {item.sessionsOnDay.slice(0, 3).map((sess, dotIdx) => (
                          <View
                            key={(sess as any)?.id || dotIdx}
                            style={[
                              styles.sessionDot,
                              {
                                backgroundColor: getSessionDotColor(sess, todayKey),
                              },
                              isSelected && styles.sessionDotSelected,
                            ]}
                          />
                        ))}
                        {item.sessionCount > 3 && (
                          <Text
                            style={[
                              styles.multiEventCountText,
                              isSelected && { color: colors.void },
                            ]}
                          >
                            +{item.sessionCount - 3}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.emptyDotPlaceholder} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legenda Colori Sessioni */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SESSION_DOT_COLORS.oneshot }]} />
              <Text style={styles.legendText}>One Shot</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SESSION_DOT_COLORS.long }]} />
              <Text style={styles.legendText}>Campagna Long</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SESSION_DOT_COLORS.quest }]} />
              <Text style={styles.legendText}>Quest</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SESSION_DOT_COLORS.past }]} />
              <Text style={styles.legendText}>Passata</Text>
            </View>
          </View>

          {/* Collapsible List Header for Selected Day or Month */}
          <View style={[styles.sessionListHeader, styles.sessionListHeaderAccordion]}>
            <TouchableOpacity
              style={styles.sessionListHeaderLeft}
              onPress={() => setIsListExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <View style={styles.sessionListTitleRow}>
                <Text style={styles.sessionListTitle}>
                  {selectedDateKey
                    ? `Tavoli del ${selectedDayFormatted}`
                    : `Prossimi Tavoli (${monthLabel})`}
                </Text>
                <View style={styles.sessionCountPill}>
                  <Text style={styles.sessionCountPillText}>
                    {displayedSessions.length} {displayedSessions.length === 1 ? 'tavolo' : 'tavoli'}
                  </Text>
                </View>
              </View>
              <Text style={styles.sessionListSub}>
                {isListExpanded
                  ? (selectedDateKey
                      ? 'Tocca per comprimere i dettagli'
                      : 'Tocca per comprimere i prossimi tavoli')
                  : (selectedDateKey
                      ? 'Tocca per mostrare i tavoli del giorno'
                      : 'Tocca per mostrare i prossimi tavoli')}
              </Text>
            </TouchableOpacity>

            <View style={styles.sessionListHeaderRight}>
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
                  <Text style={styles.gmCreatePillText}>+ Tavolo</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.accordionChevronBadge}
                onPress={() => setIsListExpanded((prev) => !prev)}
                activeOpacity={0.7}
              >
                {isListExpanded ? (
                  <ChevronUp size={16} color={colors.brassLight} />
                ) : (
                  <ChevronDown size={16} color={colors.brassLight} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Render Sessions Cards when expanded */}
          {isListExpanded && (
            <View style={styles.sessionListBody}>
              {displayedSessions.length === 0 ? (
                <View style={styles.emptyDayBox}>
                  <CalendarIcon size={22} color={colors.parchmentMuted} />
                  <Text style={styles.emptyDayText}>
                    {selectedDateKey
                      ? 'Nessuna sessione programmata per questo giorno.'
                      : `Nessuna sessione futura programmata per ${monthLabel}.`}
                  </Text>
                  {selectedDateKey && (
                    <TouchableOpacity
                      style={styles.showAllBtn}
                      onPress={() => setSelectedDateKey(null)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.showAllBtnText}>Mostra tutti i prossimi tavoli</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                displayedSessions.map((session) => (
                  <GoogleCalendarSessionCard
                    key={session.id}
                    session={session}
                    isGmView={isGmView}
                    activeCampaignId={activeCampaignId}
                    actionInProgressId={actionInProgressId}
                    onPress={() => handleSessionCardTap(session)}
                    onGmManage={() => onGmManageSession && onGmManageSession(session)}
                    onPlayerAction={() => {
                      if (onPlayerOpenSession) onPlayerOpenSession(session);
                      else if (onSignUp) onSignUp(session);
                    }}
                  />
                ))
              )}
            </View>
          )}
        </>
      )}

      {/* ================= MODE 2: GOOGLE CALENDAR AGENDA / PROGRAMMA ================= */}
      {viewMode === 'agenda' && (
        <View style={styles.agendaContainer}>
          <View style={styles.agendaHeaderNotice}>
            <Text style={styles.agendaHeaderTitle}>PROGRAMMA CRONOLOGICO GILDA</Text>
            <Text style={styles.agendaHeaderSub}>
              Tutti i prossimi tavoli in ordine temporale. Clicca su un tavolo per {isGmView ? 'gestire gli iscritti' : 'prenotare'}.
            </Text>
          </View>

          {upcomingAgendaSessions.length === 0 ? (
            <View style={styles.emptyDayBox}>
              <CalendarIcon size={24} color={colors.parchmentMuted} />
              <Text style={styles.emptyDayText}>Nessuna sessione in programma trovata.</Text>
            </View>
          ) : (
            upcomingAgendaSessions.map((group) => (
              <View key={group.dateKey} style={styles.agendaDateGroup}>
                {/* Date header line */}
                <View style={styles.agendaDateHeader}>
                  <View style={styles.agendaDateDot} />
                  <Text style={styles.agendaDateText}>{group.dateTitle}</Text>
                </View>

                {group.items.map((session) => (
                  <GoogleCalendarSessionCard
                    key={session.id}
                    session={session}
                    isGmView={isGmView}
                    activeCampaignId={activeCampaignId}
                    actionInProgressId={actionInProgressId}
                    onPress={() => handleSessionCardTap(session)}
                    onGmManage={() => onGmManageSession && onGmManageSession(session)}
                    onPlayerAction={() => {
                      if (onPlayerOpenSession) onPlayerOpenSession(session);
                      else if (onSignUp) onSignUp(session);
                    }}
                  />
                ))}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
};

interface GoogleCalendarSessionCardProps {
  session: any;
  isGmView: boolean;
  activeCampaignId?: string | null;
  actionInProgressId?: string | null;
  onPress: () => void;
  onGmManage?: () => void;
  onPlayerAction?: () => void;
}

const GoogleCalendarSessionCard: React.FC<GoogleCalendarSessionCardProps> = ({
  session: s,
  isGmView,
  activeCampaignId,
  actionInProgressId,
  onPress,
  onGmManage,
  onPlayerAction,
}) => {
  const campName = s.campaigns?.name || s.campaignName || 'Campagna di Gilda';
  const campType: CampaignType = s.campaigns?.type || 'quest';
  const badgeMeta = CAMPAIGN_TYPE_BADGES[campType] || CAMPAIGN_TYPE_BADGES.quest;
  const timeStr = formatSessionHours(s.scheduled_at);
  const durationStr = formatSessionDuration(s.duration_hours);
  const isBusy = actionInProgressId === s.id;
  const isCurrentActiveCampaign = activeCampaignId && s.campaign_id === activeCampaignId;

  const isConfirmed = !!s.isConfirmed;
  const isWaitlist = !!s.isWaitlist;
  const confirmedCount =
    s.confirmedCount ?? (s.session_signups ? s.session_signups.filter((it: any) => it.status === 'confirmed' || it.status === 'approved').length : 0);
  const maxPlayers = s.max_players ?? 6;
  const isFull = confirmedCount >= maxPlayers;

  // Stripe color in Google Calendar style (matches dot color: Red if past, Green if Oneshot, Yellow if Long, Purple if Quest)
  const stripeColor = getSessionDotColor(s, formatDateKey(new Date()));

  return (
    <TouchableOpacity
      style={[styles.gCalCard, isCurrentActiveCampaign && styles.gCalCardActiveCamp]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Left Time Column */}
      <View style={styles.timeColumn}>
        <Text style={styles.startTimeText}>{timeStr}</Text>
        <Text style={styles.durationText}>{durationStr}</Text>
      </View>

      {/* Google Calendar Accent Stripe */}
      <View style={[styles.gCalStripe, { backgroundColor: stripeColor }]} />

      {/* Main Content */}
      <View style={styles.gCalContent}>
        {/* Campaign & Format Row */}
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: badgeMeta.bg, borderColor: badgeMeta.border },
            ]}
          >
            <Text style={[styles.typeBadgeText, { color: badgeMeta.text }]}>
              {badgeMeta.label}
            </Text>
          </View>
          <Text style={styles.campaignNameText} numberOfLines={1}>
            {campName}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.sessionCardTitle} numberOfLines={1}>
          {s.title || 'Sessione Ufficiale al Tavolo'}
        </Text>

        {/* Meta row: Location & Seats */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={12} color={colors.parchmentMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {s.location || 'Barber & Dragons'}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Users size={12} color={colors.parchmentMuted} />
            <Text style={styles.metaText}>
              {confirmedCount}/{maxPlayers} iscritti
            </Text>
          </View>
        </View>

        {/* Bottom CTA / Status Row */}
        <View style={styles.bottomRow}>
          {isGmView ? (
            <TouchableOpacity
              style={styles.gmManageBtn}
              onPress={onGmManage || onPress}
              activeOpacity={0.8}
            >
              <Crown size={12} color={colors.brassLight} />
              <Text style={styles.gmManageBtnText}>Gestisci Iscritti ({confirmedCount})</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.playerBtn,
                isConfirmed && styles.playerBtnConfirmed,
                isWaitlist && styles.playerBtnWaitlist,
                isFull && !isConfirmed && !isWaitlist && styles.playerBtnFull,
              ]}
              onPress={onPlayerAction || onPress}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={colors.void} />
              ) : isConfirmed ? (
                <>
                  <CheckCircle2 size={12} color={colors.emerald} />
                  <Text style={styles.playerBtnTextConfirmed}>Iscritto · Dettagli</Text>
                </>
              ) : isWaitlist ? (
                <>
                  <Hourglass size={12} color={colors.brassLight} />
                  <Text style={styles.playerBtnTextWaitlist}>In Lista d&apos;Attesa</Text>
                </>
              ) : isFull ? (
                <>
                  <AlertCircle size={12} color={colors.crimsonLight} />
                  <Text style={styles.playerBtnTextFull}>Completo · Attesa</Text>
                </>
              ) : (
                <>
                  <Sparkles size={12} color={colors.void} />
                  <Text style={styles.playerBtnText}>Iscriviti al Tavolo</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.tapToManageText}>Tocca per aprire ➔</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.stone,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 157, 73, 0.25)',
    padding: 14,
    marginBottom: 20,
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.3,
  },
  sessionCountBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  sessionCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  viewSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 2,
  },
  viewSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewSwitchBtnActive: {
    backgroundColor: colors.brassBase,
  },
  viewSwitchText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  viewSwitchTextActive: {
    color: colors.void,
  },
  subControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterToggleBtnActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassBase,
  },
  filterToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  filterToggleTextActive: {
    color: colors.void,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
    textTransform: 'uppercase',
  },
  weekdayWeekendText: {
    color: colors.brassLight,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 4,
  },
  dayCell: {
    width: '14.28%',
    minHeight: 44,
    height: 46,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    borderRadius: 8,
    marginVertical: 1,
  },
  dayCellOtherMonth: {
    opacity: 0.25,
  },
  dayCellToday: {
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    borderWidth: 1,
    borderColor: colors.brassBase,
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
    marginTop: 3,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gCalEventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sessionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sessionDotSelected: {
    borderWidth: 1.5,
    borderColor: colors.void,
  },
  multiEventCountText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  emptyDotPlaceholder: {
    width: 7,
    height: 7,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingTop: 8,
    paddingBottom: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  sessionListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  sessionListTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brassLight,
  },
  sessionListSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  clearFilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  gmCreatePillBtn: {
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  gmCreatePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  sessionListHeaderAccordion: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
    borderTopWidth: 1,
  },
  sessionListHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  sessionListTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sessionCountPill: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  sessionCountPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
  },
  sessionListHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accordionChevronBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  sessionListBody: {
    marginTop: 10,
  },
  emptyDayBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyDayText: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
  },
  showAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  showAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  /* Google Calendar Card Styles */
  gCalCard: {
    flexDirection: 'row',
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  gCalCardActiveCamp: {
    borderColor: colors.brassBase,
    backgroundColor: colors.stoneHighlight,
  },
  timeColumn: {
    width: 60,
    paddingVertical: 12,
    paddingLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  startTimeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  durationText: {
    fontSize: 10,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  gCalStripe: {
    width: 4,
    height: '100%',
  },
  gCalContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  campaignNameText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.brassLight,
  },
  sessionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  gmManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  gmManageBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
  },
  playerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  playerBtnConfirmed: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  playerBtnWaitlist: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.4)',
  },
  playerBtnFull: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  playerBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  playerBtnTextConfirmed: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.emerald,
  },
  playerBtnTextWaitlist: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
  },
  playerBtnTextFull: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.crimsonLight,
  },
  tapToManageText: {
    fontSize: 10,
    color: colors.parchmentMuted,
    fontWeight: '600',
  },
  /* Agenda Styles */
  agendaContainer: {
    paddingTop: 4,
  },
  agendaHeaderNotice: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  agendaHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassBase,
    letterSpacing: 0.6,
  },
  agendaHeaderSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  agendaDateGroup: {
    marginBottom: 16,
  },
  agendaDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  agendaDateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brassBase,
  },
  agendaDateText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.3,
  },
});
