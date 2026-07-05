const PATHS: Record<string, string> = {
  search: 'M7.5 2a5.5 5.5 0 1 0 3.32 9.87l3.4 3.41 1.06-1.06-3.4-3.4A5.5 5.5 0 0 0 7.5 2Zm-4 5.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z',
  camera:
    'M6.5 3 5.4 4.5H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2.4L11.5 3h-5ZM9 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
  download: 'M9 2v8.6l2.8-2.8 1.1 1.1L8 13.8l-4.9-4.9 1.1-1.1L7 10.6V2h2ZM3 15h12v1.5H3V15Z',
};

/** Set minim de iconițe SVG cu contur consecvent — înlocuiește emoji-ul folosit
 * ca element funcțional de UI (randare inconsecventă cross-OS/browser), nu și
 * emoji-ul de copy persuasiv (🎯, 🔥), care rămâne intenționat. */
export default function Icon({ name, size = 14 }: { name: keyof typeof PATHS; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-2px' }}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
