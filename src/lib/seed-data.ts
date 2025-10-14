
export const genres = [
    {
        "id": "holy-week",
        "name": "Holy Week",
        "description": "Hymns for the Holy Pascha week.",
        "icon": "Candlestick"
    }
];

export const hymns = [
    {
        "id": "tai-shouri",
        "name": "Tai Shouri",
        "genreId": "holy-week",
    }
];

export const recordings = [
    {
        "hymnId": "tai-shouri",
        "cantor": "Cantor Tharwat",
        "audioUrl": "CantorTharwat/CantorTharwat_MournfulTaishouri.mp3",
        "marks": [0, 18, 36, 54, 72, 90, 108]
    },
    {
        "hymnId": "tai-shouri",
        "cantor": "Cantor Ibrahim",
        "audioUrl": "CantorIbrahim/CantorIbrahim_MournfulTaishouri.mp3",
        "marks": [0, 17, 34, 51, 68, 85, 102]
    },
    {
        "hymnId": "tai-shouri",
        "cantor": "Cantor Gad",
        "audioUrl": "CantorGad/CantorGad_MournfulTaishouri.mp3",
        "marks": [0, 20, 40, 60, 80, 100, 120]
    }
];
