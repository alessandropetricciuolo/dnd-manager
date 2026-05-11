"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

export type FowRadialMenuItem = {
  id: string;
  label: string;
  disabled?: boolean;
};

type FowRadialMenuProps = {
  open: boolean;
  x: number;
  y: number;
  ariaLabel: string;
  items: FowRadialMenuItem[];
  openingGuardUntil: number;
  variant?: "default" | "context";
  /** Sopra canvas / transform (proiezione FoW); default 1200 */
  zIndexBase?: number;
  /** Se impostato, il menu viene montato qui (es. `document.body`) per evitare clip/stacking da antenati. */
  portalTarget?: HTMLElement | null;
  onClose: () => void;
  onSelect: (item: FowRadialMenuItem) => boolean | void;
};

const ITEM_STAGGER = 0.04;

function ringRadiusForItems(variant: "default" | "context", count: number): number {
  if (variant === "context") return 86;
  if (count <= 2) return 84;
  if (count <= 4) return 100;
  return 112;
}

function angleForIndex(i: number, total: number): number {
  return -Math.PI / 2 + (i / total) * Math.PI * 2;
}

const shellVariants = {
  hidden: { scale: 0.35, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 420,
      damping: 30,
      mass: 0.65,
    },
  },
  exit: {
    scale: 0.88,
    opacity: 0,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as const },
  },
};

export function FowRadialMenu({
  open,
  x,
  y,
  ariaLabel,
  items,
  openingGuardUntil,
  variant = "default",
  zIndexBase = 1200,
  portalTarget = null,
  onClose,
  onSelect,
}: FowRadialMenuProps) {
  const total = items.length;
  const ringR = ringRadiusForItems(variant, total);
  const zRoot = zIndexBase;
  const zMenu = zIndexBase + 1;

  const tree = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="fow-radial-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ position: "fixed", inset: 0, zIndex: zRoot, pointerEvents: "none" }}
        >
          <motion.div
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "auto",
              background: "rgba(0,0,0,0.1)",
            }}
            onPointerDown={(e) => {
              if (performance.now() < openingGuardUntil) return;
              // Il menu si apre col tasto destro: su molti browser arriva ancora un pointerdown
              // con button===2 sul backdrop appena montato, che chiudeva il menu prima di vedere le voci.
              if (e.button === 2) return;
              if (e.button !== 0) return;
              e.preventDefault();
              onClose();
            }}
          />

          <motion.div
            role="menu"
            aria-label={ariaLabel}
            variants={shellVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: "fixed",
              left: x,
              top: y,
              zIndex: zMenu,
              pointerEvents: "none",
              transform: "translate(-50%, -50%)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div style={{ position: "relative", width: 0, height: 0, pointerEvents: "none" }}>
              {items.map((item, i) => {
                const angle = angleForIndex(i, total);
                const dx = Math.cos(angle) * ringR;
                const dy = Math.sin(angle) * ringR;
                const disabled = Boolean(item.disabled);
                return (
                  <div
                    key={`${item.id}-${i}`}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
                      pointerEvents: "none",
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 520,
                        damping: 34,
                        delay: 0.03 + i * ITEM_STAGGER,
                      }}
                      style={{ pointerEvents: "none" }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        disabled={disabled}
                        aria-disabled={disabled}
                        onClick={(e) => {
                          if (disabled) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const keepOpen = onSelect(item);
                          if (keepOpen !== false) onClose();
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{
                          pointerEvents: disabled ? "none" : "auto",
                          margin: 0,
                          padding: "10px 14px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: disabled ? "rgba(30,30,34,0.75)" : "rgba(22,22,26,0.94)",
                          color: disabled ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.94)",
                          fontSize: 13,
                          fontWeight: 500,
                          letterSpacing: "0.02em",
                          cursor: disabled ? "default" : "pointer",
                          whiteSpace: "nowrap",
                          boxShadow: disabled
                            ? "none"
                            : "0 12px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
                        }}
                      >
                        {item.label}
                      </button>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (portalTarget) {
    return createPortal(tree, portalTarget);
  }
  return tree;
}
