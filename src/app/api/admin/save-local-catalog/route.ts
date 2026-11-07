import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: Request) {
  try {
    const catalog = await request.json();
    const content = JSON.stringify(catalog, null, 2);
    
    const catalogPaths = [
      path.resolve(process.cwd(), 'data/catalog.json'),
      path.resolve(process.cwd(), 'public/data/catalog.json'),
      path.resolve(process.cwd(), '../cantor_hymns_mobile/src/data/catalog.json'),
    ];
    // In production or publish, sync src/data/catalog.json as well, but skip in dev to prevent file-watcher HMR reload loops
    if (process.env.NODE_ENV === 'production') {
      catalogPaths.push(path.resolve(process.cwd(), 'src/data/catalog.json'));
    }
    
    catalogPaths.forEach(p => {
      try {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, content, 'utf8');
      } catch (e) {
        console.warn(`Could not sync ${p}:`, e);
      }
    });

    // If genres are included, synchronize genres.json so ranks and subgenres persist across script runs
    if (Array.isArray(catalog.genres)) {
      const genresContent = JSON.stringify(catalog.genres, null, 2);
      const genrePaths = [
        path.resolve(process.cwd(), 'data/genres.json'),
        path.resolve(process.cwd(), 'public/data/genres.json'),
        path.resolve(process.cwd(), '../cantor_hymns_mobile/src/data/genres.json'),
        path.resolve(process.cwd(), 'src/data/genres.json'),
      ];

      genrePaths.forEach(p => {
        try {
          fs.mkdirSync(path.dirname(p), { recursive: true });
          fs.writeFileSync(p, genresContent, 'utf8');
        } catch (e) {
          console.warn(`Could not sync genres.json to ${p}:`, e);
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Local catalog.json and genres.json synchronized successfully across all locations.',
    });
  } catch (err: any) {
    console.error('Error saving local catalog:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to write local catalog' },
      { status: 500 }
    );
  }
}
