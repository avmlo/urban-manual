'use client';

/**
 * MobileBottomSheet - Draggable bottom sheet for mobile trip interactions
 * Snap points: peek (30vh), half (50vh), full (85vh)
 * Glass-morphism background with slide-y-in entrance
 */
import { useRef, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Initial snap height as vh percentage */
  initialSnap?: 'peek' | 'half' | 'full';
  title?: string;
}

const SNAP_POINTS = {
  peek: 30,
  half: 50,
  full: 85,
};

export default function MobileBottomSheet({
  isOpen,
  onClose,
  children,
  initialSnap = 'half',
  title,
}: MobileBottomSheetProps) {
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Swipe down fast or drag down past 40% → close
    if (velocity > 500 || offset > window.innerHeight * 0.3) {
      onClose();
    }
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: `${100 - SNAP_POINTS[initialSnap]}%` }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className="lg:hidden fixed inset-x-0 bottom-0 z-50 glass-panel rounded-t-2xl overflow-hidden"
            style={{ maxHeight: '90vh' }}
          >
            {/* Drag handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-10 h-1 rounded-full bg-[var(--editorial-text-tertiary)]/30" />
            </div>

            {/* Title */}
            {title && (
              <div className="px-4 pb-2">
                <h3 className="text-sm font-semibold text-[var(--editorial-text-primary)]">{title}</h3>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-safe">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
