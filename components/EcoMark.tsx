export default function EcoMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 42 42" fill="none">
      <path d="M8 27.5C16.8 27.3 24.7 21.7 29.6 11.2C30.5 21.1 25.6 31.1 15.2 32.7" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M10.2 28.8C8.2 20.3 12.6 11 27.9 9.4C26.2 18.8 20.8 26.6 10.2 28.8Z" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round" />
    </svg>
  );
}
