import { useState } from 'preact/hooks';
import { shop } from '../i18n/shop';
import type { Locale } from '../i18n/ui';

type Slide = { kind: 'photo'; src: string } | { kind: 'video'; src: string; poster: string };

/** Product photos and video: a large view, previous/next, and a strip of thumbnails. */
export default function ProductGallery(props: { lang: Locale; alt: string; photos: string[]; video: { url: string; poster: string } | null }) {
  const t = shop[props.lang];
  const slides: Slide[] = props.photos.map((src) => ({ kind: 'photo', src }));
  if (props.video) slides.splice(Math.min(1, slides.length), 0, { kind: 'video', src: props.video.url, poster: props.video.poster });
  const [index, setIndex] = useState(0);
  const current = slides[index];
  const go = (step: number) => setIndex((index + step + slides.length) % slides.length);
  const label = (n: number) => t.photoOf.replace('{n}', String(n + 1)).replace('{total}', String(slides.length));

  return (
    <div class="gallery" aria-roledescription="carousel" aria-label={t.photos}>
      <div class="gallery__stage" aria-live="polite">
        {current.kind === 'photo' ? (
          <img src={current.src} alt={`${props.alt} — ${label(index)}`} width="800" height="800" fetchpriority={index === 0 ? 'high' : 'auto'} />
        ) : (
          <video src={current.src} poster={current.poster} controls autoplay muted loop playsInline preload="metadata" aria-label={`${props.alt} — ${t.video}`} />
        )}
        {slides.length > 1 && (
          <>
            <button type="button" class="gallery__nav gallery__nav--prev" onClick={() => go(-1)} aria-label={t.previous}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button type="button" class="gallery__nav gallery__nav--next" onClick={() => go(1)} aria-label={t.next}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
      {slides.length > 1 && (
        <ul class="gallery__thumbs">
          {slides.map((s, i) => (
            <li>
              <button type="button" aria-pressed={i === index} aria-label={s.kind === 'video' ? t.playVideo : label(i)} onClick={() => setIndex(i)}>
                <img src={s.kind === 'video' ? s.poster : s.src} alt="" width="72" height="72" loading="lazy" />
                {s.kind === 'video' && (
                  <span class="gallery__play" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
