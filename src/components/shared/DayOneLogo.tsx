import React from 'react';

interface DayOneLogoProps {
  size?: number | string;
  className?: string;
  alt?: string;
}

/**
 * DayOne logo — faithful SVG recreation of the official app icon.
 * Dark navy rounded-square background with a blue "D" arc and vertical I-bar.
 * The `size` prop controls both width and height (square).
 */
export const DayOneLogo = ({
  size = 48,
  className = '',
  alt = 'DayOne logo',
}: DayOneLogoProps) => {
  const s = typeof size === 'string' ? parseInt(size, 10) : size;

  return (
    <svg
      role="img"
      aria-label={alt}
      width={s}
      height={s}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`.trim()}
    >
      {/* ── Background: dark navy rounded square ── */}
      <rect width="200" height="200" rx="42" fill="#0d1526" />

      {/*
        ── "D" arc shape ──
        An open C/D shape: a thick arc on the right, two horizontal arms
        extending left, connected by a thin vertical spine on the far left.
        Colour: vivid cornflower blue #4872f5
      */}

      {/* Outer arc path for the "D" — drawn as a thick stroked arc */}
      {/* We use a single compound path: outer contour minus inner cutout */}
      <path
        d="
          M 62 48
          H 98
          C 142 48 162 70 162 100
          C 162 130 142 152 98 152
          H 62
          V 136
          H 98
          C 130 136 146 120 146 100
          C 146 80 130 64 98 64
          H 62
          Z
        "
        fill="#4872f5"
      />

      {/*
        ── Vertical I-bar / cursor ──
        A thin vertical stroke with small horizontal serifs at top and bottom.
        Sits to the right of the "D" arc.
        Colour: lighter blue #89aaff
      */}
      {/* Main vertical stem */}
      <rect x="148" y="58" width="10" height="84" rx="5" fill="#89aaff" />
      {/* Top serif */}
      <rect x="140" y="56" width="26" height="9" rx="4.5" fill="#89aaff" />
      {/* Bottom serif */}
      <rect x="140" y="135" width="26" height="9" rx="4.5" fill="#89aaff" />
    </svg>
  );
};
