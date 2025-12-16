
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
        "marks": [
            0, 13.8, 27.6, 41.4, 56.5, 70.8, 85, 99.3, 113.6, 127.9, 142.2, 156.5, 170.8
        ]
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
        "marks": [18.548753, 26.266653, 43.177204, 63.877336, 73.763958, 90.498652, 107.342189, 124.485046, 137.650579, 149.033799, 159.360051, 166.403414, 181.233346, 195.201599, 209.305908, 233.970028, 252.246672, 261.815833, 275.511979, 286.350981, 296.237602, 310.795425, 325.580006, 334.967761, 357.779552, 377.734201, 396.373657, 417.053929, 430.432613, 449.888396, 468.346446, 489.979099, 508.936015, 524.400867, 548.593108, 562.470659, 572.765443, 586.098777, 596.302858, 606.869752, 622.833471, 635.305126, 646.960455, 662.017144, 672.992201, 685.554559, 706.597643, 733.173607, 749.515066, 760.172662, 767.973116, 782.032073, 796.317787, 808.471982, 827.930032, 858.088762, 883.304182, 896.093297, 909.562685, 923.712345, 938.769034, 950.787175, 970.515066, 995.54908, 1019.993524, 1049.335928, 1059.086495, 1080.855202, 1104.891483, 1123.224817, 1144.585361, 1159.64205, 1171.297379, 1183.179465, 1202.136381, 1227.896018, 1242.72595, 1260.095565, 1274.381279, 1289.301914, 1301.818921, 1321.047946, 1335.33366, 1352.068354, 1378.326857, 1403.050213, 1417.834794, 1437.217335, 1449.326178, 1465.69806, 1511.097153, 1541.294432, 1561.591484, 1578.961099, 1592.038196]
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
