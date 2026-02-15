
export const genres = [
    {
        "id": "holy-week",
        "name": "Holy Week",
        "rank": 1,
        "description": "Hymns for the Holy Pascha week.",
        "icon": "https://picsum.photos/seed/icon-holy-week/48/48",
        "backgroundUrl": "backgrounds/holy-week.jpg",
        "contentUrl": "content/holy-week.txt",
        "active": true,
        "cantorCloudActive": true
    },
    {
        "id": "kiahk",
        "name": "Kiahk",
        "rank": 2,
        "description": "Praises for the month of Kiahk.",
        "icon": "https://picsum.photos/seed/icon-kiahk/48/48",
        "backgroundUrl": "backgrounds/kiahk.jpg",
        "active": true,
        "cantorCloudActive": true
    },
    {
        "id": "resurrection",
        "name": "Resurrection",
        "rank": 3,
        "description": "Hymns for the Resurrection feast.",
        "icon": "https://picsum.photos/seed/icon-resurrection/48/48",
        "backgroundUrl": "backgrounds/resurrection.jpg",
        "active": true,
        "cantorCloudActive": true
    }
];

export const cantors = [
    { "id": "cantor-bola", "name": "Cantor Bola", "rank": 2, "cantorCloudActive": true },
    { "id": "cantor-gad", "name": "Cantor Gad", "rank": 3, "cantorCloudActive": true },
    { "id": "cantor-ibrahim", "name": "Cantor Ibrahim", "rank": 4, "cantorCloudActive": true },
    { "id": "cantor-tharwat", "name": "Cantor Tharwat", "rank": 5, "cantorCloudActive": true },
    { "id": "hics", "name": "HICS", "rank": 1, "cantorCloudActive": true }
];

export const hymns = [
    {
        "id": "tai-shouri",
        "name": "Tai Shouri (Mournful)",
        "genreId": ["holy-week"],
        "description": "The hymn of the censer, offered during the Vespers and Matins prayers, sung in a mournful tune for Holy Week.",
        "lyricsEnglish": "",
        "lyricsCoptic": "",
        "lyricsArabic": ""
    },
    {
        "id": "ti-shouri",
        "name": "Ti-Shouri (Mournful)",
        "genreId": ["holy-week"],
        "description": "The feminine version of 'Tai Shouri', the hymn of the censer, sung in a mournful tune for Holy Week.",
        "lyricsEnglish": "",
        "lyricsCoptic": "",
        "lyricsArabic": ""
    },
    {
        "id": "omonogenees",
        "name": "O Monogenees",
        "genreId": ["holy-week"],
        "description": "'O Only-Begotten Son', a hymn about the incarnation of Christ, sung during Holy Week.",
        "lyricsEnglish": "",
        "lyricsCoptic": "",
        "lyricsArabic": ""
    },
    {
        "id": "tarh",
        "name": "Tarh",
        "genreId": ["holy-week"],
        "description": "A mournful hymn sung during the Holy Pascha week, reflecting on the Passion of Christ.",
        "lyricsEnglish": "",
        "lyricsCoptic": "",
        "lyricsArabic": ""
    },
    {
        "id": "kata-ni-khoros",
        "name": "Kata Ni Khoros",
        "genreId": ["resurrection"],
        "description": "'Like the choirs of angels', a joyful hymn of praise sung after the Resurrection.",
        "lyricsEnglish": "lyrics/english/kata-ni-khoros_english.md",
        "lyricsCoptic": "lyrics/coptic/kata-ni-khoros_coptic.md",
        "lyricsArabic": "lyrics/arabic/kata-ni-khoros_arabic.md"
    },
    {
        "id": "psalm-150",
        "name": "Psalm 150",
        "genreId": ["kiahk"],
        "description": "A joyful psalm of praise, often sung during the Kiahk praises before the birth of Christ.",
        "lyricsEnglish": "",
        "lyricsCoptic": "",
        "lyricsArabic": ""
    },
    {
        "id": "christos-anesti",
        "name": "Christos Anesti",
        "genreId": ["resurrection"],
        "description": "'Christ is Risen', the primary hymn of the Resurrection, sung throughout the 50 days of Pentecost.",
        "lyricsEnglish": "",
        "lyricsCoptic": "",
        "lyricsArabic": ""
    },
    {
        "id": "mournful-agios",
        "name": "Agios (Mournful)",
        "genreId": ["holy-week"],
        "description": "'Holy God, Holy Mighty, Holy Immortal', sung in a mournful tune during the prayers of Holy Week.",
        "lyricsEnglish": "",
        "lyricsCoptic": "",
        "lyricsArabic": ""
    },
    {
        "id": "tribes",
        "name": "Tribes of Israel",
        "genreId": ["holy-week"],
        "description": "The names of the 12 tribes of Israel sealed, chanted in the 7th chapter of the Book of Revelation.",
        "lyricsEnglish": "lyrics/english/tribes_english.md",
        "lyricsCoptic": "lyrics/coptic/tribes_coptic.md",
        "lyricsArabic": "lyrics/arabic/tribes_arabic.md"
    }
];

export const recordings = [
    {
        "hymnId": "tai-shouri",
        "cantorId": "cantor-bola",
        "audioUrl": "tracks/cantor-bola/cantor-bola_tai-shouri.mp3",
        "active": true,
        "mode": "learn"
    },
    {
        "hymnId": "ti-shouri",
        "cantorId": "cantor-ibrahim",
        "audioUrl": "tracks/cantor-ibrahim/cantor-ibrahim_ti-shouri.mp3",
        "active": true,
        "mode": "learn"
    },
    {
        "hymnId": "omonogenees",
        "cantorId": "cantor-bola",
        "audioUrl": "tracks/cantor-bola/cantor-bola_omonogenees.mp3",
        "active": true,
        "mode": "learn"
    },
    {
        "hymnId": "tarh",
        "cantorId": "cantor-gad",
        "audioUrl": "tracks/cantor-gad/cantor-gad_tarh.mp3",
        "active": true,
        "mode": "learn"
    },
    {
        "hymnId": "kata-ni-khoros",
        "cantorId": "cantor-ibrahim",
        "audioUrl": "tracks/cantor-ibrahim/cantor-ibrahim_kata-ni-khoros.mp3",
        "active": true,
        "mode": "learn"
    },
    {
        "hymnId": "tarh",
        "cantorId": "cantor-ibrahim",
        "audioUrl": "tracks/cantor-ibrahim/cantor-ibrahim_tarh.mp3",
        "active": true,
        "mode": "learn"
    },
    {
        "hymnId": "tai-shouri",
        "cantorId": "cantor-tharwat",
        "audioUrl": "tracks/cantor-tharwat/cantor-tharwat_tai-shouri.mp3",
        "active": true,
        "mode": "listen"
    },
    {
        "hymnId": "kata-ni-khoros",
        "cantorId": "hics",
        "audioUrl": "tracks/hics/hics_kata-ni-khoros.mp3",
        "active": true,
        "mode": "learn"
    },
    {
        "hymnId": "tai-shouri",
        "cantorId": "hics",
        "audioUrl": "tracks/hics/hics_tai-shouri.mp3",
        "active": true,
        "mode": "learn"
    },
    {
        "hymnId": "omonogenees",
        "cantorId": "hics",
        "audioUrl": "tracks/hics/hics_omonogenees.mp3",
        "active": true,
        "mode": "listen"
    },
    {
        "hymnId": "psalm-150",
        "cantorId": "cantor-ibrahim",
        "audioUrl": "tracks/cantor-ibrahim/cantor-ibrahim_psalm-150.mp3",
        "active": true,
        "mode": "learn"
    },
    {
        "hymnId": "christos-anesti",
        "cantorId": "hics",
        "audioUrl": "tracks/hics/hics_christos-anesti.mp3",
        "active": true,
        "mode": "learn"
    },
    {
        "hymnId": "mournful-agios",
        "cantorId": "cantor-ibrahim",
        "audioUrl": "tracks/cantor-ibrahim/cantor-ibrahim_mournful-agios.mp3",
        "active": true,
        "mode": "learn"
    },
    {
        "hymnId": "tribes",
        "cantorId": "cantor-ibrahim",
        "audioUrl": "tracks/cantor-ibrahim/cantor-ibrahim_tribes.mp3",
        "active": true,
        "mode": "learn"
    }
];
