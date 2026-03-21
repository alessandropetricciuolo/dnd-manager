'use server';

export type GenerateSheetResult = {
  success: boolean;
  message: string;
};

export async function generateSheetAction(
  formData: FormData
): Promise<GenerateSheetResult> {
  const characterName = (formData.get("characterName") as string | null)?.trim() ?? "";
  const race = (formData.get("race") as string | null)?.trim() ?? "";
  const dndClass = (formData.get("dndClass") as string | null)?.trim() ?? "";
  const level = (formData.get("level") as string | null)?.trim() ?? "";

  await new Promise((r) => setTimeout(r, 1000));

  return {
    success: true,
    message: `Ricerca dati per ${race} ${dndClass} di livello ${level} avviata... (PG: ${characterName || "senza nome"})`,
  };
}
