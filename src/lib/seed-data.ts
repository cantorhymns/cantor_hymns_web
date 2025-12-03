
export const genres = [
    {
        "id": "holy-week",
        "name": "Holy Week",
        "description": "Hymns for the Holy Pascha week.",
        "icon": "Candlestick"
    },
    {
        "id": "kiahk",
        "name": "Kiahk",
        "description": "Praises for the month of Kiahk.",
        "icon": "Star"
    },
    {
        "id": "resurrection",
        "name": "Resurrection",
        "description": "Hymns for the Resurrection feast.",
        "icon": "Sunrise"
    }
];

export const cantors = [
    { "id": "cantor-bola", "name": "Cantor Bola" },
    { "id": "cantor-gad", "name": "Cantor Gad" },
    { "id": "cantor-ibrahim", "name": "Cantor Ibrahim" },
    { "id": "cantor-tharwat", "name": "Cantor Tharwat" },
    { "id": "hics", "name": "HICS" }
];

export const hymns = [
    {
        "id": "tai-shouri",
        "name": "Tai Shouri (Mournful)",
        "genreId": "holy-week",
    },
    {
        "id": "omonogenees",
        "name": "O Monogenees",
        "genreId": "holy-week"
    },
    {
        "id": "tarh",
        "name": "Tarh",
        "genreId": "holy-week"
    },
    {
        "id": "kata-ni-khoros",
        "name": "Kata Ni Khoros",
        "genreId": "holy-week"
    }
];

export const recordings = [
    {
        "hymnId": "tai-shouri",
        "cantorId": "cantor-bola",
        "audioUrl": "CantorBola/CantorBola_MournfulTaishouri.mp3",
        "marks": [0, 15, 30, 45, 60, 75, 90, 105, 120, 135]
    },
    {
        "hymnId": "omonogenees",
        "cantorId": "cantor-bola",
        "audioUrl": "CantorBola/CantorBola_Omonogenees.mp3",
        "marks": [0, 15, 30, 45]
    },
    {
        "hymnId": "tarh",
        "cantorId": "cantor-gad",
        "audioUrl": "CantorGad/CantorGad_Tar7.mp3",
        "marks": [0, 15, 30, 45, 60, 75]
    },
    {
        "hymnId": "kata-ni-khoros",
        "cantorId": "cantor-ibrahim",
        "audioUrl": "CantorIbrahim/CantorIbrahim_KataNiKhoros7egab.mp3",
        "marks": [0, 15, 30, 45, 60, 75, 90]
    },
    {
        "hymnId": "tarh",
        "cantorId": "cantor-ibrahim",
        "audioUrl": "CantorIbrahim/CantorIbrahim_Tar7.mp3",
        "marks": [0, 15, 30, 45, 60, 75]
    },
    {
        "hymnId": "tai-shouri",
        "cantorId": "cantor-tharwat",
        "audioUrl": "CantorTharwat/CantorTharwat_MournfulTaishouri.mp3",
        "marks": [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165]
    },
    {
        "hymnId": "kata-ni-khoros",
        "cantorId": "hics",
        "audioUrl": "HICS/HICS_KataNiKhoros7egab.mp3",
        "marks": [0, 15, 30, 45, 60, 75, 90]
    },
    {
        "hymnId": "tai-shouri",
        "cantorId": "hics",
        "audioUrl": "HICS/HICS_MournfulTaishouri.mp3",
        "marks": [0, 15, 30, 45, 60, 75, 90, 105, 120, 135]
    },
    {
        "hymnId": "omonogenees",
        "cantorId": "hics",
        "audioUrl": "HICS/HICS_Omonogenees.mp3",
        "marks": [0, 15, 30, 45]
    }
];
