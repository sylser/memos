import { useEffect, useMemo, useState } from "react";
import { PhotoSlider } from "react-photo-view";
import type { DataType } from "react-photo-view/dist/types";
import MotionPhotoPreview from "@/components/MotionPhotoPreview";
import type { PreviewMediaItem } from "@/utils/media-item";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imgUrls?: string[];
  items?: PreviewMediaItem[];
  initialIndex?: number;
}

function PreviewImageDialog({ open, onOpenChange, imgUrls = [], items, initialIndex = 0 }: Props) {
  const [index, setIndex] = useState(initialIndex);

  const previewItems = useMemo(
    () => items ?? imgUrls.map((url) => ({ id: url, kind: "image" as const, sourceUrl: url, posterUrl: url, filename: "Image" })),
    [imgUrls, items],
  );

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
    }
  }, [initialIndex, open]);

  const images = useMemo<DataType[]>(
    () =>
      previewItems.map((item) => {
        if (item.kind === "video") {
          return {
            key: item.id,
            render: ({ attrs }) => (
              <div {...attrs} className="flex h-full w-full items-center justify-center">
                <video
                  src={item.sourceUrl}
                  poster={item.posterUrl}
                  className="max-h-[80vh] max-w-[90vw] rounded-md object-contain"
                  controls
                  autoPlay
                  playsInline
                />
              </div>
            ),
          };
        }

        if (item.kind === "motion") {
          return {
            key: item.id,
            render: ({ attrs }) => (
              <div {...attrs} className="flex h-full w-full items-center justify-center">
                <MotionPhotoPreview
                  posterUrl={item.posterUrl}
                  motionUrl={item.motionUrl}
                  alt={item.filename || "Live photo"}
                  presentationTimestampUs={item.presentationTimestampUs}
                  badgeClassName="left-3 top-3 sm:left-4 sm:top-4"
                  mediaClassName="max-h-[80vh] max-w-[90vw] rounded-md object-contain"
                />
              </div>
            ),
          };
        }

        return {
          key: item.id,
          src: item.sourceUrl,
        };
      }),
    [previewItems],
  );

  const currentItem = previewItems[Math.max(0, Math.min(index, previewItems.length - 1))];

  if (previewItems.length === 0) {
    return null;
  }

  return (
    <PhotoSlider
      images={images}
      visible={open}
      index={index}
      onIndexChange={setIndex}
      onClose={() => onOpenChange(false)}
      loop={false}
      bannerVisible
      toolbarRender={() => (
        <div className="max-w-[50vw] truncate px-2 text-sm font-medium text-white" title={currentItem?.filename || "Attachment"}>
          {currentItem?.filename || "Attachment"}
        </div>
      )}
    />
  );
}

export default PreviewImageDialog;
