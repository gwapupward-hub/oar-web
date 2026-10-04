/** Neutral initials tile. Third-party apps never get the OAR gradient, so a listing cannot borrow OAR's look. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => Array.from(w)[0]?.toUpperCase() ?? '')
    .join('') || '?';
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {initials}
    </span>
  );
}
