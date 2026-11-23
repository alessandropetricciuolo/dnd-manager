export const ELDARIA_CAMPAIGN_ID = "d9962add-4d55-42ef-bfd7-96eddfe49969";
export const ELDARIA_GUIDE_PATH = `/campaigns/${ELDARIA_CAMPAIGN_ID}/primer`;

export const ELDARIA_STARTER_WIKI_IDS = [
  "4adc79be-8bd8-45ff-ab8b-7268e81202c2", // Egida dell’Ordine
  "09f2d80c-d38f-40fc-aa4c-35b6faa8bc3b", // Portale di Portico
  "e8c0cf10-635d-4817-8fe0-084c74e0c8fa", // Cristallo di passaggio
];

const LEGACY_COMPENDIUM = /^Compendio di Eldaria:\s*$/im;
const WELCOME_HEADING = /^## Benvenuto in Eldaria\s*$/im;

// Older primers mark rules with bracketed labels, which Markdown treats as paragraphs.
const LEGACY_RULE_HEADING = /^(?:\*\*)?(\[(?:Regola Zero|Progressione|Combattimento|Sopravvivenza|Equipaggiamento|Interazione|Sfida)\][^\n]+?)(?:\*\*)?$/gm;

export function getEldariaGuideSections(markdown: string) {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const welcome = WELCOME_HEADING.exec(normalized);
  const remaining = welcome ? normalized.slice(0, welcome.index) : normalized;
  const rules = remaining.split(LEGACY_COMPENDIUM, 1)[0].trim();

  return {
    rules: rules.replace(LEGACY_RULE_HEADING, (_, heading: string) => `## ${heading}`),
    welcome: welcome ? normalized.slice(welcome.index + welcome[0].length).trim() : null,
  };
}
