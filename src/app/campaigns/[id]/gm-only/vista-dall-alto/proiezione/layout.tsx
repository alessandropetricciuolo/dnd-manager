import { ProiezioneChromeCleanup } from "./proiezione-chrome-cleanup";

export default function VistaDallAltoProiezioneLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProiezioneChromeCleanup />
      {children}
    </>
  );
}
