
'use client';
import { useMemo } from 'react';
import { useGenre } from './useGenres';
import { useHymns } from './useHymns';
import { useFileContent } from './useFileContent';
import { Hymn } from '../types';

export function useOrderedHymns(genreId?: string) {
    const { data: genre, isLoading: isGenreLoading } = useGenre(genreId);
    const { data: allHymnsForGenre, isLoading: areHymnsLoading } = useHymns(genreId); 
    const { content: fileContent, isLoading: isContentLoading } = useFileContent(genre?.contentUrl);

    const isLoading = isGenreLoading || areHymnsLoading || (genre?.contentUrl && isContentLoading);

    const result = useMemo(() => {
        if (!allHymnsForGenre || !genre) return { groupedHymns: null, flatPlaylist: [] };

        const hymnsMap = new Map(allHymnsForGenre.map(h => [h.id, h]));
        const orderedHymnIds = new Set<string>();

        if (!fileContent) {
            const sorted = [...allHymnsForGenre].sort((a, b) => a.name.localeCompare(b.name));
            return { groupedHymns: [{ name: null, hymns: sorted }], flatPlaylist: sorted };
        }

        const groups: { name: string | null; hymns: Hymn[] }[] = [];
        let currentGroup: { name: string | null; hymns: Hymn[] } = { name: null, hymns: [] };
        groups.push(currentGroup);
        
        fileContent.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            if (trimmedLine.startsWith('subGenre:')) {
                const subGenreName = trimmedLine.substring('subGenre:'.length).trim();
                if (currentGroup.hymns.length > 0) {
                    currentGroup = { name: subGenreName, hymns: [] };
                    groups.push(currentGroup);
                } else if (currentGroup.name === null) {
                    currentGroup.name = subGenreName;
                }
            } else {
                const hymnId = trimmedLine;
                const hymn = hymnsMap.get(hymnId);
                if (hymn) {
                    currentGroup.hymns.push(hymn);
                    orderedHymnIds.add(hymnId);
                }
            }
        });
        
        const uncatHymns = allHymnsForGenre.filter(h => !orderedHymnIds.has(h.id))
            .sort((a,b) => a.name.localeCompare(b.name));

        const finalGroups = groups.filter(g => g.hymns.length > 0);
        if (uncatHymns.length > 0) {
            finalGroups.push({ name: 'Other Hymns', hymns: uncatHymns });
        }
        
        if (finalGroups.length === 0 && allHymnsForGenre.length > 0) {
             const sorted = [...allHymnsForGenre].sort((a, b) => a.name.localeCompare(b.name));
             return { groupedHymns: [{ name: null, hymns: sorted }], flatPlaylist: sorted };
        }

        const flatPlaylist = finalGroups.flatMap(g => g.hymns);

        return { groupedHymns: finalGroups, flatPlaylist };

    }, [genre, allHymnsForGenre, fileContent]);

    return { ...result, isLoading };
}
