import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 24,
          background: 'hsl(225, 65%, 60%)', // primary color
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          fill="currentColor"
          width="140"
          height="140"
        >
          <circle cx="50" cy="50" r="6" />
          <path d="M47 10h6v80h-6z" />
          <path d="M10 47h80v6H10z" />
          <circle cx="50" cy="15" r="4" />
          <circle cx="42" cy="15" r="4" />
          <circle cx="58" cy="15" r="4" />
          <circle cx="50" cy="85" r="4" />
          <circle cx="42" cy="85" r="4" />
          <circle cx="58" cy="85" r="4" />
          <circle cx="15" cy="50" r="4" />
          <circle cx="15" cy="42" r="4" />
          <circle cx="15" cy="58" r="4" />
          <circle cx="85" cy="50" r="4" />
          <circle cx="85" cy="42" r="4" />
          <circle cx="85" cy="58" r="4" />
        </svg>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
