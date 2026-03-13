import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import type { Image } from '@ai-platform/types';

interface GalleryLightboxProps {
  images: Image[];
  index: number;
  onClose: () => void;
}

export function GalleryLightbox({ images, index, onClose }: GalleryLightboxProps) {
  const slides = images.map((img) => ({
    src: img.cdnUrl ?? img.url,
    alt: img.prompt,
    width: img.width,
    height: img.height,
  }));

  return (
    <Lightbox open={index >= 0} close={onClose} index={index} slides={slides} plugins={[Zoom]} />
  );
}
