export default function EcoMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 64 64" fill="none">
      <g stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 48V23" />
        <path d="M31.4 25.8C27.7 17.1 20.7 12.3 12.3 12.8C12.7 20.9 18.8 26.5 28.7 27.7" />
        <path d="M32.6 25.8C36.3 17.1 43.3 12.3 51.7 12.8C51.3 20.9 45.2 26.5 35.3 27.7" />
        <path d="M6.5 30h9.2l5.7 19h27.8l5.1-19H39.5" />
        <path d="M18 32.8h10.5M38 32.8h15.5" />
        <circle cx="25" cy="56" r="3.8" />
        <circle cx="46" cy="56" r="3.8" />
      </g>
    </svg>
  );
}
