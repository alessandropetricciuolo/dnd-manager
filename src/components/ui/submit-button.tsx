"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  /** Testo mostrato quando il form è in invio (es. "Salvataggio...") */
  loadingText: string;
  /** Override per pending: utile quando il form usa onSubmit + useState invece di form action (es. pending={isLoading}) */
  pending?: boolean;
};

/**
 * Bottone submit universale: disabilita al click e mostra spinner + loadingText
 * per evitare doppi invii. Usa useFormStatus quando il form ha action (server action);
 * altrimenti passa pending={isLoading} dai form con onSubmit.
 */
export function SubmitButton({
  children,
  loadingText,
  pending: pendingOverride,
  className,
  disabled,
  ...rest
}: SubmitButtonProps) {
  const { pending: statusPending } = useFormStatus();
  const pending = pendingOverride ?? statusPending;

  return (
    <Button
      type="submit"
      className={cn(className)}
      disabled={disabled ?? pending}
      {...rest}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
