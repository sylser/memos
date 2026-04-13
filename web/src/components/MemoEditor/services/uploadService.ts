import { create } from "@bufbuild/protobuf";
import { attachmentServiceClient } from "@/connect";
import type { Attachment } from "@/types/proto/api/v1/attachment_service_pb";
import { AttachmentSchema, MotionMediaSchema } from "@/types/proto/api/v1/attachment_service_pb";
import type { LocalFile } from "../types/attachment";

export const uploadService = {
  async uploadFiles(localFiles: LocalFile[]): Promise<Attachment[]> {
    if (localFiles.length === 0) return [];

    const attachments: Attachment[] = [];

    for (const localFile of localFiles) {
      const { motionMedia } = localFile;
      const file = await maybeCompressImage(localFile.file, getImageCompressionQuality());
      const buffer = new Uint8Array(await file.arrayBuffer());
      const attachment = await attachmentServiceClient.createAttachment({
        attachment: create(AttachmentSchema, {
          filename: file.name,
          size: BigInt(file.size),
          type: file.type,
          content: buffer,
          motionMedia: motionMedia ? create(MotionMediaSchema, motionMedia) : undefined,
        }),
      });
      attachments.push(attachment);
    }

    return attachments;
  },
};

const getImageCompressionQuality = (): number => {
  const raw = localStorage.getItem("memos-image-compression-quality");
  const value = raw ? Number(raw) : 90;
  if (!Number.isFinite(value) || value <= 0 || value > 100) {
    return 90;
  }
  return Math.round(value);
};

const shouldCompressImage = (file: File, quality: number): boolean => {
  if (!file.type.startsWith("image/")) {
    return false;
  }
  if (quality >= 100 || quality <= 0) {
    return false;
  }
  return file.type === "image/jpeg" || file.type === "image/jpg" || file.type === "image/webp";
};

const maybeCompressImage = async (file: File, quality: number): Promise<File> => {
  if (!shouldCompressImage(file, quality)) {
    return file;
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }
    context.drawImage(image, 0, 0);
    const blob = await canvasToBlob(canvas, file.type === "image/jpg" ? "image/jpeg" : file.type, quality / 100);
    if (!blob || blob.size >= file.size) {
      return file;
    }
    return new File([blob], file.name, { type: blob.type, lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
