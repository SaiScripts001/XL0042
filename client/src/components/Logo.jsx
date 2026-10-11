/** Heart + stethoscope mark — light blue heart with a deep-navy stethoscope. */
export default function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M24 42.5S3.5 29.6 3.5 17.4C3.5 10.2 9 4.5 15.9 4.5c3.8 0 6.7 1.8 8.1 4.2 1.4-2.4 4.3-4.2 8.1-4.2C38.9 4.5 44.5 10.2 44.5 17.4 44.5 29.6 24 42.5 24 42.5z"
        fill="#3b82f6"
      />
      <path
        d="M24 37.6S9.6 28.4 9.6 19.7c0-4.9 3.7-8.7 8.3-8.7 2.7 0 4.9 1.3 6.1 3.3 1.2-2 3.4-3.3 6.1-3.3 4.6 0 8.3 3.8 8.3 8.7 0 8.7-14.4 17.9-14.4 17.9z"
        fill="#16264a"
      />
      <path
        d="M33 33.5c1.6 2.6 4.4 4 7.3 3.6"
        stroke="#16264a"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="40.6" cy="36.8" r="3.6" fill="#fff" stroke="#16264a" strokeWidth="2.4" />
    </svg>
  )
}
