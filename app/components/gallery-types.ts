// Shared media shape between ImageGallery and InfiniteGallery.
//
// Only InfiniteGallery renders video (see the `<video>` branch in its
// `ensureTile`). ImageGallery is stills-only and keeps taking
// `GalleryImage[]`, which is why these are two types rather than one loose
// shape with an optional `kind` — handing a clip to ImageGallery, which would
// render it as a broken <img>, should not typecheck.
export type GalleryImage = { src: string; alt?: string; kind?: "image" };

// `poster` is what a tile shows while its clip is paused — which is most of
// the time, since only the few most prominent clips on screen are allowed to
// play (see MAX_CONCURRENT_VIDEOS). Without it, a paused and not-yet-loaded
// <video> renders as a black rectangle.
export type GalleryVideo = {
  src: string;
  alt?: string;
  kind: "video";
  poster?: string;
};

export type GalleryMedia = GalleryImage | GalleryVideo;
