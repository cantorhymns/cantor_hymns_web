import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'Cantor - Coptic Hymn Learning App';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 64,
          background: 'hsl(225, 50%, 96%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Alegreya, serif',
          color: 'hsl(225, 65%, 60%)',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          fill="currentColor"
          width="200"
          height="200"
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
        <div style={{ marginTop: 40, fontSize: 80, fontWeight: 'bold' }}>
          Cantor
        </div>
        <div style={{ marginTop: 10, fontSize: 40, color: 'hsl(225, 20%, 45%)' }}>
          An app to learn Coptic hymns
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
