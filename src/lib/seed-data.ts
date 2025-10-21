
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
        "cantor": "CantorBola",
        "audioUrl": "CantorBola/CantorBola_MournfulTaishouri.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
    {
        "hymnId": "omonogenees",
        "cantor": "CantorBola",
        "audioUrl": "CantorBola/CantorBola_Omonogenees.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
    {
        "hymnId": "tarh",
        "cantor": "CantorGad",
        "audioUrl": "CantorGad/CantorGad_Tar7.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
    {
        "hymnId": "kata-ni-khoros",
        "cantor": "CantorIbrahim",
        "audioUrl": "CantorIbrahim/CantorIbrahim_KataNiKhoros7egab.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
    {
        "hymnId": "tarh",
        "cantor": "CantorIbrahim",
        "audioUrl": "CantorIbrahim/CantorIbrahim_Tar7.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
    {
        "hymnId": "tai-shouri",
        "cantor": "CantorTharwat",
        "audioUrl": "CantorTharwat/CantorTharwat_MournfulTaishouri.mp3",
        "marks": [0, 18, 36, 54, 72, 90, 108]
    },
    {
        "hymnId": "kata-ni-khoros",
        "cantor": "HICS",
        "audioUrl": "HICS/HICS_KataNiKhoros7egab.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
    {
        "hymnId": "tai-shouri",
        "cantor": "HICS",
        "audioUrl": "HICS/HICS_MournfulTaishouri.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
    {
        "hymnId": "omonogenees",
        "cantor": "HICS",
        "audioUrl": "HICS/HICS_Omonogenees.mp3",
        "marks": [0, 15, 30, 45, 60]
    }
];
