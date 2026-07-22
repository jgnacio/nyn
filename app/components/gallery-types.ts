// Shared image shape between ImageGallery and InfiniteGallery so both
// components take the exact same `images` prop format.
export type GalleryImage = { src: string; alt?: string };
