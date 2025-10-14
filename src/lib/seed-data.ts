
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
        "id": "agios-o-theos",
        "name": "Agios O Theos",
        "genreId": "holy-week",
    },
    {
        "id": "golgotha",
        "name": "Golgotha",
        "genreId": "holy-week",
    },
    {
        "id": "omonogenees",
        "name": "O Monogenees",
        "genreId": "holy-week"
    },
    {
        "id": "kata-ni-khoros",
        "name": "Kata Ni Khoros",
        "genreId": "holy-week"
    },
    {
        "id": "phai-etafenf",
        "name": "Phai Etafenf",
        "genreId": "holy-week"
    },
    {
        "id": "tarh",
        "name": "Tarh",
        "genreId": "holy-week"
    },
    {
        "id": "ten-gowt",
        "name": "Ten Gowt",
        "genreId": "kiahk",
    },
    {
        "id": "christos-anesti",
        "name": "Christos Anesti",
        "genreId": "resurrection",
    }
];

export const recordings = [
    {
        "hymnId": "tai-shouri",
        "cantor": "Cantor Bola",
        "audioUrl": "CantorBola/CantorBola_MournfulTaishouri.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
    {
        "hymnId": "omonogenees",
        "cantor": "Cantor Bola",
        "audioUrl": "CantorBola/CantorBola_Omonogenees.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
    {
        "hymnId": "tarh",
        "cantor": "Cantor Gad",
        "audioUrl": "CantorGad/CantorGad_Tar7.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
    {
        "hymnId": "kata-ni-khoros",
        "cantor": "Cantor Ibrahim",
        "audioUrl": "CantorIbrahim/CantorIbrahim_KataNiKhoros7egab.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
    {
        "hymnId": "tarh",
        "cantor": "Cantor Ibrahim",
        "audioUrl": "CantorIbrahim/CantorIbrahim_Tar7.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
    {
        "hymnId": "tai-shouri",
        "cantor": "Cantor Tharwat",
        "audioUrl": "CantorTharwat/CantorTharwat_MournfulTaishouri.mp3",
        "marks": [0, 18, 36, 54, 72, 90, 108]
    },
    {
        "hymnId": "phai-etafenf",
        "cantor": "Cantor Tharwat",
        "audioUrl": "CantorTharwat/CantorTharwat_Phaietafenf.mp3",
        "marks": [0, 15, 30, 45, 60]
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
    },
    {
        "hymnId": "agios-o-theos",
        "cantor": "Cantor Farag",
        "audioUrl": "CantorFarag/CantorFarag_Agios.mp3",
        "marks": [0, 15, 30, 45, 60]
    },
     {
        "hymnId": "golgotha",
        "cantor": "HCOC",
        "audioUrl": "HCOC/HCOC_Golgotha.mp3",
        "marks": [0, 22, 45, 68, 90]
    },
    {
        "hymnId": "ten-gowt",
        "cantor": "HCOC",
        "audioUrl": "HCOC/HCOC_TenGowt.mp3",
        "marks": [0, 10, 20, 30]
    },
    {
        "hymnId": "christos-anesti",
        "cantor": "HCOC",
        "audioUrl": "HCOC/HCOC_ChristosAnesti.mp3",
        "marks": [0, 12, 24, 36]
    }
];
