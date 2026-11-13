import React from 'react';

export function StudyLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="40" height="40" rx="10" fill="#101B32" stroke="#3B82F6" strokeWidth="1.25" />
      <path
        d="M11 11.5H27.5L25 16H16V19.5H24L22 23.5H16V30H11V11.5Z"
        fill="#EAF2FF"
      />
      <path
        d="M25.5 23.5L29 27L25.5 30.5L22 27L25.5 23.5Z"
        fill="#38BDF8"
      />
    </svg>
  );
}
