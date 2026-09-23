// Inline icon sprite, copied verbatim from the original static mockup
// (index.html). Rendered once in the root layout; every icon elsewhere is
// `<Icon id="i-heart" />`, a thin <use> reference into this sprite.
export function IconSprite() {
  return (
    <svg className="sprite" aria-hidden="true" focusable="false">
      <defs>
        <g id="i-back">
          <path d="M9 14H5V10M5 10L8.5 13.5A7 7 0 1 0 10 6.5" />
        </g>
        <g id="i-shirt">
          <path d="M8 3 5 4.5 3 7l2.5 2L7 7.5V17h10V7.5L18.5 9 21 7l-2-2.5L16 3a4 4 0 0 1-8 0Z" />
        </g>
        <g id="i-gem">
          <path d="M6 3h12l3 6-9 12L3 9Z" />
          <path d="M3 9h18M9 3 7 9l5 12M15 3l2 6-5 12" />
        </g>
        <g id="i-swap">
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="13" width="8" height="8" rx="2" />
          <path d="M13 7h5.5M18.5 7 16 4.5M18.5 7 16 9.5M11 17H5.5M5.5 17 8 14.5M5.5 17 8 19.5" />
        </g>
        <g id="i-video">
          <rect x="3" y="6" width="12" height="12" rx="2" />
          <path d="m15 11 6-3.5v9L15 13Z" />
        </g>
        <g id="i-poses">
          <circle cx="8" cy="6" r="2.4" />
          <path d="M8 9v11M4.5 12.5 8 11l3.5 1.5M5.5 20 8 15.5 10.5 20" />
          <circle cx="17" cy="6" r="2.4" />
          <path d="M17 9v11" />
        </g>
        <g id="i-hand">
          <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7c-3 0-4.5-1.5-5.6-3.4L5 15.5c-.6-1 .3-2.3 1.4-1.9L8 14.5" />
        </g>
        <g id="i-tools">
          <path d="M14.7 6.3a3.9 3.9 0 0 0 5.1 5.1L21 12l-8.8 8.8a2 2 0 0 1-2.8 0l-.2-.2a2 2 0 0 1 0-2.8L12 15" />
          <path d="m3 7 4-4 3.5 3.5L7 10Z" />
        </g>
        <g id="i-sparkle">
          <path d="m12 3 2.2 5.3L19.5 10l-5.3 1.7L12 17l-2.2-5.3L4.5 10l5.3-1.7Z" />
          <path d="M18.5 15.5 19.5 18l2.5 1-2.5 1-1 2.5-1-2.5L15 19l2.5-1Z" />
        </g>
        <g id="i-image">
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <circle cx="8.5" cy="9.5" r="1.6" />
          <path d="m4 17 4.8-4.8a2 2 0 0 1 2.8 0L20 20" />
        </g>
        <g id="i-chevron">
          <path d="m6 9 6 6 6-6" />
        </g>
        <g id="i-search">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </g>
        <g id="i-ratio">
          <rect x="4" y="3" width="16" height="18" rx="2.5" />
          <path d="M9 3v18M4 9h16" />
        </g>
        <g id="i-layers">
          <path d="m12 3 8.5 4.5L12 12 3.5 7.5Z" />
          <path d="m3.5 12 8.5 4.5 8.5-4.5" />
        </g>
        <g id="i-coin">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v9M14.5 9.8c-.6-.8-1.5-1.1-2.5-1.1-1.4 0-2.5.7-2.5 1.9s1.1 1.6 2.5 1.9 2.5.7 2.5 1.9-1.1 1.9-2.5 1.9c-1 0-1.9-.3-2.5-1.1" />
        </g>
        <g id="i-magic">
          <path d="m5 19 9.5-9.5M16 4l.9 2.1L19 7l-2.1.9L16 10l-.9-2.1L13 7l2.1-.9Z" />
          <path d="m6.5 4 .6 1.4 1.4.6-1.4.6L6.5 8l-.6-1.4L4.5 6l1.4-.6ZM19 15l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z" />
        </g>
        <g id="i-close">
          <path d="m6 6 12 12M18 6 6 18" />
        </g>
        <g id="i-menu">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </g>
        <g id="i-check">
          <path d="m5 12.5 4.5 4.5L19 7" />
        </g>
        <g id="i-heart">
          <path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.8a4.1 4.1 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" />
        </g>
        <g id="i-plus">
          <path d="M12 5v14M5 12h14" />
        </g>
        <g id="i-user">
          <circle cx="12" cy="8" r="3.6" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </g>
        <g id="i-scene">
          <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
          <path d="M3 15.5 8 11l4 3.5L16 11l5 4.5" />
          <circle cx="8" cy="8.5" r="1.4" />
        </g>
        <g id="i-filter">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </g>
      </defs>
    </svg>
  );
}

export function Icon({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={"ico" + (className ? " " + className : "")} viewBox="0 0 24 24" aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}
