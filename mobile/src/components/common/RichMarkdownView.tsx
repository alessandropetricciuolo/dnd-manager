import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

interface RichMarkdownViewProps {
  markdown: string;
  compact?: boolean;
}

type InlineSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

function parseInlineSpans(raw: string): InlineSpan[] {
  const cleaned = raw
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const spans: InlineSpan[] = [];
  const tokenRegex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = tokenRegex.exec(cleaned);
  while (match) {
    if (match.index > lastIndex) {
      spans.push({ text: cleaned.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('***') && token.endsWith('***')) {
      spans.push({ text: token.slice(3, -3), bold: true, italic: true });
    } else if (token.startsWith('**') && token.endsWith('**')) {
      spans.push({ text: token.slice(2, -2), bold: true });
    } else if (token.startsWith('*') && token.endsWith('*')) {
      spans.push({ text: token.slice(1, -1), italic: true });
    }
    lastIndex = match.index + token.length;
    match = tokenRegex.exec(cleaned);
  }
  if (lastIndex < cleaned.length) {
    spans.push({ text: cleaned.slice(lastIndex) });
  }
  return spans.length > 0 ? spans : [{ text: cleaned }];
}

function stripCellHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMarkdownTable(lines: string[]): { header: string[]; rows: string[][] } | null {
  const splitRow = (line: string) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => stripCellHtml(c));

  if (lines.length < 2) return null;
  const header = splitRow(lines[0]);
  const isDivider = /^[\s|:\-]+$/.test(lines[1]);
  const bodyLines = isDivider ? lines.slice(2) : lines.slice(1);
  const rows = bodyLines.map(splitRow).filter((r) => r.some((c) => c.length > 0));
  if (header.length === 0 && rows.length === 0) return null;
  return { header, rows };
}

export const RichMarkdownView: React.FC<RichMarkdownViewProps> = ({
  markdown,
  compact = false,
}) => {
  const text = (markdown ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  const renderInline = (content: string, baseStyle: any) => {
    const spans = parseInlineSpans(content);
    return (
      <Text style={baseStyle}>
        {spans.map((sp, idx) => (
          <Text
            key={idx}
            style={[
              sp.bold && styles.boldSpan,
              sp.italic && styles.italicSpan,
            ]}
          >
            {sp.text}
          </Text>
        ))}
      </Text>
    );
  };

  const renderTable = (key: string, header: string[], rows: string[][]) => (
    <ScrollView
      key={key}
      horizontal
      showsHorizontalScrollIndicator
      style={styles.tableScroll}
    >
      <View style={styles.tableBox}>
        {header.length > 0 && (
          <View style={styles.tableHeaderRow}>
            {header.map((cell, cIdx) => (
              <Text key={`th-${cIdx}`} style={styles.tableHeaderCell}>
                {cell}
              </Text>
            ))}
          </View>
        )}
        {rows.map((row, rIdx) => (
          <View
            key={`tr-${rIdx}`}
            style={[styles.tableRow, rIdx % 2 === 1 && styles.tableRowAlt]}
          >
            {row.map((cell, cIdx) => (
              <Text key={`td-${rIdx}-${cIdx}`} style={styles.tableCell}>
                {cell}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  while (i < lines.length) {
    const line = lines[i]?.trimEnd() ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // HTML <table>...</table> block
    if (/^<table[\s>]/i.test(trimmed)) {
      const tableLines: string[] = [line];
      i += 1;
      while (i < lines.length) {
        tableLines.push(lines[i] ?? '');
        if (/<\/table>\s*$/i.test(lines[i] ?? '')) {
          i += 1;
          break;
        }
        i += 1;
      }
      const html = tableLines.join('\n');
      const trMatches = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
      const parsedRows = trMatches
        .map((m) =>
          Array.from(m[1].matchAll(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi)).map((c) =>
            stripCellHtml(c[2] ?? ''),
          ),
        )
        .filter((r) => r.length > 0);
      if (parsedRows.length > 0) {
        elements.push(
          renderTable(`html-tbl-${i}`, parsedRows[0], parsedRows.slice(1)),
        );
      }
      continue;
    }

    // Markdown pipe table | ... |
    if (trimmed.startsWith('|') && trimmed.includes('|') && i + 1 < lines.length && lines[i + 1]?.trim().startsWith('|')) {
      const pipeLines: string[] = [];
      while (i < lines.length && lines[i]?.trim().startsWith('|')) {
        pipeLines.push(lines[i] ?? '');
        i += 1;
      }
      const tbl = parseMarkdownTable(pipeLines);
      if (tbl) {
        elements.push(renderTable(`md-tbl-${i}`, tbl.header, tbl.rows));
      }
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<View key={`hr-${i}`} style={styles.hr} />);
      i += 1;
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2].trim();
      const style =
        level === 1
          ? compact ? styles.h2 : styles.h1
          : level === 2
            ? styles.h2
            : styles.h3;
      elements.push(
        <View key={`h-${i}`} style={level <= 2 ? styles.headingWrap : undefined}>
          {renderInline(content, style)}
        </View>,
      );
      i += 1;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s?/, '');
      elements.push(
        <View key={`bq-${i}`} style={styles.blockquote}>
          {renderInline(quoteText, styles.blockquoteText)}
        </View>,
      );
      i += 1;
      continue;
    }

    // Bullet list
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      elements.push(
        <View key={`li-${i}`} style={styles.listRow}>
          <Text style={styles.bullet}>•</Text>
          <View style={{ flex: 1 }}>
            {renderInline(bulletMatch[1], compact ? styles.bodyCompact : styles.body)}
          </View>
        </View>,
      );
      i += 1;
      continue;
    }

    // Numbered list
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      elements.push(
        <View key={`ol-${i}`} style={styles.listRow}>
          <Text style={styles.bullet}>{orderedMatch[1]}.</Text>
          <View style={{ flex: 1 }}>
            {renderInline(orderedMatch[2], compact ? styles.bodyCompact : styles.body)}
          </View>
        </View>,
      );
      i += 1;
      continue;
    }

    // Regular paragraph
    elements.push(
      <View key={`p-${i}`}>
        {renderInline(trimmed, compact ? styles.bodyCompact : styles.body)}
      </View>,
    );
    i += 1;
  }

  return <View style={compact ? styles.containerCompact : styles.container}>{elements}</View>;
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  containerCompact: {
    gap: 5,
  },
  headingWrap: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200, 157, 73, 0.2)',
    paddingBottom: 3,
    marginTop: 4,
  },
  h1: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.3,
  },
  h2: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.brassLight,
  },
  h3: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brassBase,
    marginTop: 2,
  },
  body: {
    fontSize: 13,
    lineHeight: 19.5,
    color: colors.parchmentLight,
  },
  bodyCompact: {
    fontSize: 12,
    lineHeight: 17.5,
    color: colors.parchmentMuted,
  },
  boldSpan: {
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  italicSpan: {
    fontStyle: 'italic',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingLeft: 2,
  },
  bullet: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brassBase,
    lineHeight: 18,
  },
  blockquote: {
    borderLeftWidth: 2.5,
    borderLeftColor: colors.brassBase,
    backgroundColor: 'rgba(200, 157, 73, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  blockquoteText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    lineHeight: 18,
    color: colors.parchmentLight,
  },
  hr: {
    height: 1,
    backgroundColor: colors.stoneBorder,
    marginVertical: 4,
  },
  tableScroll: {
    marginVertical: 4,
  },
  tableBox: {
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.stone,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(200, 157, 73, 0.16)',
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  tableHeaderCell: {
    minWidth: 88,
    maxWidth: 180,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tableCell: {
    minWidth: 88,
    maxWidth: 180,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    color: colors.parchmentLight,
  },
});

export default RichMarkdownView;
