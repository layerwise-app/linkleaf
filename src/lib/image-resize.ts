import { config } from '~/linkleaf.config';

const { avatarMaxBytes, avatarPixels, avatarTypes } = config.limits;

/** Checks a chosen file, returning a message when it can't be used. */
export function avatarFileProblem(file: File): string | null {
  if (!(avatarTypes as readonly string[]).includes(file.type)) {
    return 'Use a JPG, PNG, or WebP image.';
  }
  if (file.size > avatarMaxBytes) {
    return `Use an image under ${avatarMaxBytes / (1024 * 1024)} MB.`;
  }
  return null;
}

/**
 * Center-crops to a square and re-encodes. A phone photo becomes a file of a
 * few dozen kilobytes, which keeps pages fast and drops EXIF data such as GPS.
 */
export async function resizeAvatar(
  file: File,
  size: number = avatarPixels
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser couldn’t process this image.');
  const side = Math.min(bitmap.width, bitmap.height);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size
  );
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Your browser couldn’t process this image.')),
      'image/jpeg',
      0.86
    );
  });
}

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Couldn’t read this image.'));
    reader.readAsDataURL(blob);
  });
