import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BookOpen, Check, Shield, Sparkles, User, X } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import { colors } from '../../theme/colors';
import {
  ELDARIA_CAMPAIGN_ID,
  ELDARIA_STARTER_WIKI_IDS,
  extractWikiEntityBody,
  getEldariaGuideSections,
  resolveTelegramOrImageUrl,
} from '../../lib/long-campaign-helpers';
import { Campaign } from '../../types';
import { RichMarkdownView } from '../common/RichMarkdownView';

type EldariaTab = 'benvenuto' | 'wiki' | 'regolamento' | 'personaggio';

interface StarterArticle {
  id: string;
  name: string;
  markdown: string;
}

export interface CampaignGuideModalProps {
  visible: boolean;
  campaign: Campaign | null;
  canConfirmRead?: boolean;
  isConfirmedRead?: boolean;
  onConfirmRead?: (campaignId: string) => Promise<boolean>;
  onClose: () => void;
}

export const CampaignGuideModal: React.FC<CampaignGuideModalProps> = ({
  visible,
  campaign,
  canConfirmRead = false,
  isConfirmedRead = false,
  onConfirmRead,
  onClose,
}) => {
  const isEldaria = campaign?.id === ELDARIA_CAMPAIGN_ID;
  const [eldariaTab, setEldariaTab] = useState<EldariaTab>('benvenuto');
  const [starterArticles, setStarterArticles] = useState<StarterArticle[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [loadingArticles, setLoadingArticles] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<boolean>(false);

  const primerMarkdown = campaign?.player_primer?.trim() ?? '';
  const eldariaSections = useMemo(
    () => (isEldaria && primerMarkdown ? getEldariaGuideSections(primerMarkdown) : null),
    [isEldaria, primerMarkdown],
  );

  useEffect(() => {
    if (!visible || !isEldaria) return;
    let cancelled = false;
    setEldariaTab('benvenuto');
    setConfirmError(false);

    async function loadStarterWiki() {
      setLoadingArticles(true);
      try {
        const { data } = await supabase
          .from('wiki_entities')
          .select('id, name, content')
          .eq('campaign_id', ELDARIA_CAMPAIGN_ID)
          .eq('visibility', 'public')
          .eq('is_secret', false)
          .eq('admin_only', false)
          .eq('is_campaign_document', false)
          .is('archived_at', null)
          .in('id', [...ELDARIA_STARTER_WIKI_IDS]);

        if (cancelled) return;
        const byId = new Map((data ?? []).map((row: any) => [row.id as string, row]));
        const ordered: StarterArticle[] = ELDARIA_STARTER_WIKI_IDS.flatMap((id) => {
          const hit = byId.get(id);
          if (!hit) return [];
          return [
            {
              id,
              name: String(hit.name ?? ''),
              markdown: extractWikiEntityBody(hit.content),
            },
          ];
        });
        setStarterArticles(ordered);
        setSelectedArticleId(ordered[0]?.id ?? null);
      } catch {
        if (!cancelled) setStarterArticles([]);
      } finally {
        if (!cancelled) setLoadingArticles(false);
      }
    }

    void loadStarterWiki();
    return () => {
      cancelled = true;
    };
  }, [visible, isEldaria]);

  if (!campaign) return null;

  const coverUri = resolveTelegramOrImageUrl(campaign.image_url, null);
  const activeArticle =
    starterArticles.find((a) => a.id === selectedArticleId) ?? starterArticles[0] ?? null;

  const handleConfirmPress = async () => {
    if (!onConfirmRead || confirming) return;
    setConfirming(true);
    setConfirmError(false);
    try {
      const ok = await onConfirmRead(campaign.id);
      if (!ok) setConfirmError(true);
    } catch {
      setConfirmError(true);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Cover Header */}
          <View style={styles.headerBanner}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
            ) : null}
            <View style={styles.coverOverlay} />

            <View style={styles.headerTopRow}>
              <View style={styles.eyebrowPill}>
                <BookOpen size={11} color={colors.brassLight} />
                <Text style={styles.eyebrowText}>
                  {isEldaria ? 'GUIDA INTRODUTTIVA · ELDARIA' : 'GUIDA DEL GIOCATORE'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Chiudi guida"
              >
                <X size={18} color={colors.parchmentLight} />
              </TouchableOpacity>
            </View>

            <View style={{ zIndex: 2 }}>
              <Text style={styles.campaignSub}>{campaign.name}</Text>
              <Text style={styles.mainTitle}>
                {isEldaria ? 'Inizia qui' : 'Manuale & Regole della Campagna'}
              </Text>
            </View>
          </View>

          {/* Eldaria 4-Tab Bar (mirrors Web EldariaGuide) */}
          {isEldaria && (
            <View style={styles.eldariaTabsRow}>
              {(
                [
                  { id: 'benvenuto', label: 'Benvenuto' },
                  { id: 'wiki', label: 'Wiki' },
                  { id: 'regolamento', label: 'Regolamento' },
                  { id: 'personaggio', label: 'Personaggio' },
                ] as const
              ).map((t) => {
                const active = eldariaTab === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.eldariaTabBtn, active && styles.eldariaTabBtnActive]}
                    onPress={() => setEldariaTab(t.id)}
                  >
                    <Text style={[styles.eldariaTabText, active && styles.eldariaTabTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Scrollable Guide Body */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {!primerMarkdown ? (
              <Text style={styles.emptyNotice}>
                La Guida del Giocatore non è ancora stata pubblicata per questa campagna.
              </Text>
            ) : isEldaria && eldariaSections ? (
              <>
                {eldariaTab === 'benvenuto' && (
                  <View style={{ gap: 10 }}>
                    <Text style={styles.sectionHeading}>Benvenuto in Eldaria</Text>
                    {eldariaSections.welcome ? (
                      <RichMarkdownView markdown={eldariaSections.welcome} />
                    ) : (
                      <View style={{ gap: 10 }}>
                        <Text style={styles.paragraph}>
                          I tavoli delle Cronache di Eldaria giocano nello stesso mondo. Ogni gruppo ha i propri personaggi e le proprie avventure. Le scelte di un tavolo possono cambiare ciò che gli altri troveranno sulla loro strada. Quando entra un nuovo gruppo, la storia prosegue da dove è arrivata.
                        </Text>
                        <Text style={styles.paragraph}>
                          A Portico il Grande Portale Arcano è uno dei nodi del commercio. Per attraversarlo serve un cristallo che si consuma al passaggio. L’Egida dell’Ordine regola il lavoro delle gilde di avventurieri e l’accesso agli incarichi. Barber & Dragons è già in attività a Portico. Scoprirai al tavolo come la sua storia incrocia quella del tuo personaggio.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {eldariaTab === 'wiki' && (
                  <View style={{ gap: 12 }}>
                    <Text style={styles.sectionHeading}>Voci Wiki per iniziare</Text>
                    {loadingArticles ? (
                      <ActivityIndicator size="small" color={colors.brassBase} />
                    ) : starterArticles.length === 0 ? (
                      <Text style={styles.emptyNotice}>Nessuna voce introduttiva disponibile.</Text>
                    ) : (
                      <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                          {starterArticles.map((art) => {
                            const selected = art.id === activeArticle?.id;
                            return (
                              <TouchableOpacity
                                key={art.id}
                                style={[styles.articleChip, selected && styles.articleChipActive]}
                                onPress={() => setSelectedArticleId(art.id)}
                              >
                                <Text style={[styles.articleChipText, selected && styles.articleChipTextActive]}>
                                  {art.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>

                        {activeArticle ? (
                          <View style={styles.articleBox}>
                            {!/^#\s/m.test(activeArticle.markdown) && (
                              <Text style={styles.articleTitle}>{activeArticle.name}</Text>
                            )}
                            <RichMarkdownView markdown={activeArticle.markdown} />
                          </View>
                        ) : null}
                      </>
                    )}
                  </View>
                )}

                {eldariaTab === 'regolamento' && (
                  <View style={{ gap: 10 }}>
                    <Text style={styles.sectionHeading}>Regolamento</Text>
                    <RichMarkdownView markdown={eldariaSections.rules} />
                  </View>
                )}

                {eldariaTab === 'personaggio' && (
                  <View style={{ gap: 10 }}>
                    <Text style={styles.sectionHeading}>Prepara il tuo personaggio</Text>
                    <Text style={styles.paragraph}>
                      Che vita faceva il tuo personaggio prima di diventare un avventuriero? Che cosa gli ha fatto cambiare strada e che cosa cerca adesso? Se c’è una persona o un luogo a cui tiene ancora, racconta perché.
                    </Text>
                    <Text style={styles.paragraph}>
                      Consegna il background di persona ad Alessandro. Lo rivedrete insieme e lui caricherà la versione concordata quando creerà la scheda del tuo personaggio sul sito.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <RichMarkdownView markdown={primerMarkdown} />
            )}
          </ScrollView>

          {/* Footer: Eldaria Read Confirmation + Close */}
          <View style={styles.footer}>
            {isEldaria && canConfirmRead && (
              <View style={styles.confirmRow}>
                {isConfirmedRead ? (
                  <View style={styles.confirmedBadge}>
                    <Check size={14} color={colors.emerald} />
                    <Text style={styles.confirmedText}>Lettura confermata</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.confirmReadBtn}
                    disabled={confirming}
                    onPress={() => void handleConfirmPress()}
                    activeOpacity={0.85}
                  >
                    <Sparkles size={14} color={colors.void} />
                    <Text style={styles.confirmReadBtnText}>
                      {confirming ? 'Salvataggio…' : 'Ho letto la guida'}
                    </Text>
                  </TouchableOpacity>
                )}
                {confirmError && (
                  <Text style={styles.errorText}>Impossibile salvare la conferma. Riprova.</Text>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeFooterBtnText}>Chiudi Guida</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 7, 6, 0.88)',
    justifyContent: 'center',
    padding: 14,
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    overflow: 'hidden',
  },
  headerBanner: {
    minHeight: 112,
    padding: 14,
    justifyContent: 'space-between',
    backgroundColor: colors.stone,
    position: 'relative',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 9, 8, 0.65)',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  eyebrowText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.brassLight,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignSub: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.brassLight,
    marginTop: 6,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.parchmentLight,
  },
  eldariaTabsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  eldariaTabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
  },
  eldariaTabBtnActive: {
    backgroundColor: 'rgba(200, 157, 73, 0.18)',
    borderColor: colors.brassBase,
  },
  eldariaTabText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  eldariaTabTextActive: {
    color: colors.brassLight,
    fontWeight: '800',
  },
  body: {
    maxHeight: 460,
  },
  bodyContent: {
    padding: 16,
    gap: 10,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.brassLight,
    marginBottom: 2,
  },
  paragraph: {
    fontSize: 13.5,
    lineHeight: 20.5,
    color: colors.parchmentLight,
  },
  articleChip: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  articleChipActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  articleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  articleChipTextActive: {
    color: colors.void,
    fontWeight: '800',
  },
  articleBox: {
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    gap: 8,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brassLight,
  },
  emptyNotice: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: colors.parchmentMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  footer: {
    padding: 12,
    gap: 8,
    backgroundColor: colors.stone,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  confirmRow: {
    gap: 4,
  },
  confirmReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    borderRadius: 8,
    paddingVertical: 10,
  },
  confirmReadBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.void,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  confirmedText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.emerald,
  },
  errorText: {
    fontSize: 11.5,
    color: colors.crimsonLight,
    textAlign: 'center',
  },
  closeFooterBtn: {
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  closeFooterBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
});

export default CampaignGuideModal;
