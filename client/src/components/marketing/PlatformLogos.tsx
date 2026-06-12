type LogoProps = {
  className?: string;
  title?: string;
};

/** Logo Windows (4 panneaux). */
export function WindowsLogo({ className = "h-7 w-7", title = "Windows" }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" role="img" aria-label={title}>
      <title>{title}</title>
      <path fill="#00ADEF" d="M3 3.5h8.2v8.2H3V3.5zm0 10.3h8.2v8.2H3v-8.2zm10.3-10.3H21.5v8.2h-8.2V3.5zm0 10.3h8.2v8.2h-8.2v-8.2z" />
    </svg>
  );
}

/** Logo Apple officiel. */
export function AppleLogo({ className = "h-7 w-7", title = "Apple" }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" role="img" aria-label={title}>
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
      />
    </svg>
  );
}

/** Logo Android officiel. */
export function AndroidLogo({ className = "h-7 w-7", title = "Android" }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" role="img" aria-label={title}>
      <title>{title}</title>
      <path
        fill="#3DDC84"
        d="M17.6 9.48l1.84-3.18c.16-.27-.04-.62-.36-.62H15.2c-.2 0-.38.1-.5.26l-1.88 3.24a6.97 6.97 0 0 0-5.64 0L5.3 6.14a.63.63 0 0 0-.5-.26H4.92c-.32 0-.52.35-.36.62L6.4 9.48A7.02 7.02 0 0 0 2 14.5h20a7.02 7.02 0 0 0-4.4-5.02zM7.5 13.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm9 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"
      />
    </svg>
  );
}
