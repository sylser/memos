import { ChevronLeft, ChevronRight, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import MotionPhotoPreview from "@/components/MotionPhotoPreview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import useMediaQuery from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/utils/i18n";
import type { PreviewMediaItem } from "@/utils/media-item";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imgUrls?: string[];
  items?: PreviewMediaItem[];
  initialIndex?: number;
}

function PreviewImageDialog({ open, onOpenChange, imgUrls = [], items, initialIndex = 0 }: Props) {
  const t = useTranslate();
  const sm = useMediaQuery("sm");
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const gestureRef = useRef<{ startX: number; startY: number; startDistance: number; startScale: number; pinching: boolean } | null>(null);
  const previewItems = useMemo(
    () => items ?? imgUrls.map((url) => ({ id: url, kind: "image" as const, sourceUrl: url, posterUrl: url, filename: "Image" })),
    [imgUrls, items],
  );

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
    }
  }, [initialIndex, open]);

  const itemCount = previewItems.length;
  const safeIndex = Math.max(0, Math.min(currentIndex, itemCount - 1));
  const currentItem = previewItems[safeIndex];
  const hasMultiple = itemCount > 1;
  const canGoPrevious = safeIndex > 0;
  const canGoNext = safeIndex < itemCount - 1;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) {
        return;
      }

      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }

      if (event.key === "ArrowLeft") {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (event.key === "ArrowRight") {
        setCurrentIndex((prev) => Math.min(prev + 1, itemCount - 1));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [itemCount, onOpenChange, open]);

  if (!itemCount || !currentItem) {
    return null;
  }

  const handleClose = () => onOpenChange(false);
  const handlePrevious = () => {
    setScale(1);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };
  const handleNext = () => {
    setScale(1);
    setCurrentIndex((prev) => Math.min(prev + 1, itemCount - 1));
  };
  const canZoom = currentItem.kind !== "video";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!h-[100vh] !w-[100vw] !max-h-[100vh] !max-w-[100vw] overflow-hidden border-0 bg-black/92 p-0 shadow-none"
        aria-describedby="image-preview-description"
      >
        <VisuallyHidden>
          <DialogTitle>{currentItem.filename || "Attachment preview"}</DialogTitle>
        </VisuallyHidden>

        <div className="absolute inset-x-0 top-0 z-20 bg-linear-to-b from-black/70 via-black/35 to-transparent px-3 pb-6 pt-3 sm:px-5 sm:pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-white">
              <div className="truncate text-sm font-medium">{currentItem.filename || "Attachment"}</div>
              {hasMultiple && (
                <div className="mt-1 text-xs text-white/70">
                  {safeIndex + 1} / {itemCount}
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={handleClose}
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full bg-white/10 text-white hover:bg-white/16 hover:text-white"
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          className="flex h-full w-full items-center justify-center px-3 pb-20 pt-16 sm:px-16 sm:pb-8 sm:pt-20"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleClose();
            }
          }}
        >
          <div
            className="flex max-h-full max-w-full touch-none items-center justify-center"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => {
              if (!hasMultiple && !canZoom) {
                return;
              }
              if (event.touches.length === 2 && canZoom) {
                const a = event.touches.item(0);
                const b = event.touches.item(1);
                if (!a || !b) {
                  return;
                }
                gestureRef.current = {
                  startX: 0,
                  startY: 0,
                  startDistance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
                  startScale: scale,
                  pinching: true,
                };
                return;
              }
              if (event.touches.length === 1) {
                const touch = event.touches.item(0);
                if (!touch) {
                  return;
                }
                gestureRef.current = {
                  startX: touch.clientX,
                  startY: touch.clientY,
                  startDistance: 0,
                  startScale: scale,
                  pinching: false,
                };
              }
            }}
            onTouchMove={(event) => {
              if (event.touches.length === 2 && canZoom && gestureRef.current?.pinching) {
                const a = event.touches.item(0);
                const b = event.touches.item(1);
                if (!a || !b) {
                  return;
                }
                const currentDistance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
                const zoom = Math.max(
                  1,
                  Math.min((currentDistance / Math.max(gestureRef.current.startDistance, 1)) * gestureRef.current.startScale, 4),
                );
                setScale(zoom);
              }
            }}
            onTouchEnd={(event) => {
              const gesture = gestureRef.current;
              if (!gesture) {
                return;
              }
              if (gesture.pinching) {
                gestureRef.current = null;
                return;
              }
              if (event.changedTouches.length === 1 && hasMultiple && scale <= 1.02) {
                const touch = event.changedTouches[0];
                const deltaX = touch.clientX - gesture.startX;
                const deltaY = touch.clientY - gesture.startY;
                if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
                  if (deltaX < 0 && canGoNext) {
                    handleNext();
                  } else if (deltaX > 0 && canGoPrevious) {
                    handlePrevious();
                  }
                }
              }
              gestureRef.current = null;
            }}
          >
            {currentItem.kind === "video" ? (
              <video
                key={currentItem.id}
                src={currentItem.sourceUrl}
                poster={currentItem.posterUrl}
                className="max-h-[calc(100vh-8rem)] max-w-[calc(100vw-1.5rem)] rounded-md object-contain sm:max-h-[calc(100vh-7rem)] sm:max-w-[calc(100vw-8rem)]"
                controls
                autoPlay
                playsInline
              />
            ) : currentItem.kind === "motion" ? (
              <MotionPhotoPreview
                key={currentItem.id}
                posterUrl={currentItem.posterUrl}
                motionUrl={currentItem.motionUrl}
                alt={`Preview live photo ${safeIndex + 1} of ${itemCount}`}
                presentationTimestampUs={currentItem.presentationTimestampUs}
                badgeClassName="left-3 top-3 sm:left-4 sm:top-4"
                mediaClassName="max-h-[calc(100vh-8rem)] max-w-[calc(100vw-1.5rem)] rounded-md object-contain sm:max-h-[calc(100vh-7rem)] sm:max-w-[calc(100vw-8rem)]"
              />
            ) : (
              <img
                src={currentItem.sourceUrl}
                alt={`Preview image ${safeIndex + 1} of ${itemCount}`}
                className="max-h-[calc(100vh-8rem)] max-w-[calc(100vw-1.5rem)] rounded-md object-contain select-none transition-transform sm:max-h-[calc(100vh-7rem)] sm:max-w-[calc(100vw-8rem)]"
                style={{ transform: `scale(${scale})` }}
                draggable={false}
                loading="eager"
                decoding="async"
              />
            )}
          </div>
        </div>

        {hasMultiple && sm && (
          <>
            <NavButton
              side="left"
              disabled={!canGoPrevious}
              label={t("common.previous")}
              onClick={handlePrevious}
              icon={<ChevronLeft className="h-5 w-5" />}
            />
            <NavButton
              side="right"
              disabled={!canGoNext}
              label={t("common.next")}
              onClick={handleNext}
              icon={<ChevronRight className="h-5 w-5" />}
            />
          </>
        )}

        {hasMultiple && !sm && (
          <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3 pt-6">
            <div className="mx-auto flex max-w-xs items-center justify-between rounded-full bg-black/55 px-2 py-2 backdrop-blur-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                className="rounded-full px-3 text-white hover:bg-white/10 hover:text-white disabled:text-white/35"
              >
                {t("common.previous")}
              </Button>
              <div className="px-3 text-xs text-white/75">
                {safeIndex + 1} / {itemCount}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleNext}
                disabled={!canGoNext}
                className="rounded-full px-3 text-white hover:bg-white/10 hover:text-white disabled:text-white/35"
              >
                {t("common.next")}
              </Button>
            </div>
          </div>
        )}

        <div id="image-preview-description" className="sr-only">
          {t("attachment-library.preview-dialog-hint")}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface NavButtonProps {
  side: "left" | "right";
  disabled: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}

const NavButton = ({ side, disabled, label, onClick, icon }: NavButtonProps) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    disabled={disabled}
    onClick={onClick}
    aria-label={label}
    className={cn(
      "absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white disabled:opacity-25 sm:flex",
      side === "left" ? "left-4" : "right-4",
    )}
  >
    {icon}
  </Button>
);

export default PreviewImageDialog;
