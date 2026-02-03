
export const genres = [
    {
        "id": "holy-week",
        "name": "Holy Week",
        "description": "Hymns for the Holy Pascha week.",
        "icon": "https://picsum.photos/seed/icon-holy-week/48/48",
        "backgroundImageKey": "holy-week"
    },
    {
        "id": "kiahk",
        "name": "Kiahk",
        "description": "Praises for the month of Kiahk.",
        "icon": "https://picsum.photos/seed/icon-kiahk/48/48",
        "backgroundImageKey": "kiahk"
    },
    {
        "id": "resurrection",
        "name": "Resurrection",
        "description": "Hymns for the Resurrection feast.",
        "icon": "https://picsum.photos/seed/icon-resurrection/48/48",
        "backgroundImageKey": "resurrection"
    }
];

export const cantors = [
    { "id": "cantor-bola", "name": "Cantor Bola", "rank": 2 },
    { "id": "cantor-gad", "name": "Cantor Gad", "rank": 3 },
    { "id": "cantor-ibrahim", "name": "Cantor Ibrahim", "rank": 4 },
    { "id": "cantor-tharwat", "name": "Cantor Tharwat", "rank": 5 },
    { "id": "hics", "name": "HICS", "rank": 1 }
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
    },
    {
        "id": "psalm-150",
        "name": "Psalm 150",
        "genreId": "kiahk"
    }
];

export const recordings = [
    {
        "hymnId": "tai-shouri",
        "cantorId": "cantor-bola",
        "audioUrl": "CantorBola/CantorBola_MournfulTaishouri.mp3",
        "marks": [
            37.995524,
            49.922961,
            65.070354,
            79.673528,
            98.721147,
            124.616839,
            139.401420,
            164.979651,
            179.718880,
            199.859469,
            214.553347,
            224.031805,
            242.943370,
            258.045410,
            267.705274,
            286.493469,
            301.141996,
            327.854014,
            341.278050,
            353.341542,
            366.992336,
            382.321134,
            392.842676,
            406.176009,
            418.330204,
            433.477596,
            452.842676,
            467.717959,
            494.021814,
            507.717959,
            520.416372
        ],
        "active": true
    },
    {
        "hymnId": "omonogenees",
        "cantorId": "cantor-bola",
        "audioUrl": "CantorBola/CantorBola_Omonogenees.mp3",
        "marks": [
            13.154195,
            24.172336,
            37.807256,
            50.278912,
            61.435374,
            74.603175,
            92.60771,
            107.800454,
            117.904762,
            137.632653,
            149.482993,
            162.907029,
            179.777778,
            193.943326,
            212.492079,
            226.868496,
            241.256251,
            257.773258,
            274.682506,
            286.714301,
            305.083866,
            319.696111,
            336.748265,
            361.829898,
            374.711984,
            387.278878,
            409.630352,
            433.711984,
            474.446678,
            493.065726,
            506.909263,
            524.663145,
            549.123463,
            561.787862,
            574.091717,
            601.286728,
            627.409177,
            639.466363,
            684.688054,
            702.898938,
            717.33658,
            734.427268,
            748.93974,
            759.960148,
            772.529309,
            785.379649,
            807.08033,
            826.717518,
            865.892121,
            884.014253,
            919.841917,
            935.216067
        ],
        "active": true
    },
    {
        "hymnId": "tarh",
        "cantorId": "cantor-gad",
        "audioUrl": "CantorGad/CantorGad_Tar7.mp3",
        "marks": [0, 15, 30, 45, 60, 75],
        "active": true
    },
    {
        "hymnId": "kata-ni-khoros",
        "cantorId": "cantor-ibrahim",
        "audioUrl": "CantorIbrahim/CantorIbrahim_KataNiKhoros7egab.mp3",
        "marks": [0, 15, 30, 45, 60, 75, 90],
        "active": true
    },
    {
        "hymnId": "tarh",
        "cantorId": "cantor-ibrahim",
        "audioUrl": "CantorIbrahim/CantorIbrahim_Tar7.mp3",
        "marks": [18.548753, 26.266653, 43.177204, 63.877336, 73.763958, 90.498652, 107.342189, 124.485046, 137.650579, 149.033799, 159.360051, 166.403414, 181.233346, 195.201599, 209.305908, 233.970028, 252.246672, 261.815833, 275.511979, 286.350981, 296.237602, 310.795425, 325.580006, 334.967761, 357.779552, 377.734201, 396.373657, 417.053929, 430.432613, 449.888396, 468.346446, 489.979099, 508.936015, 524.400867, 548.593108, 562.470659, 572.765443, 586.098777, 596.302858, 606.869752, 622.833471, 635.305126, 646.960455, 662.017144, 672.992201, 685.554559, 706.597643, 733.173607, 749.515066, 760.172662, 767.973116, 782.032073, 796.317787, 808.471982, 827.930032, 858.088762, 883.304182, 896.093297, 909.562685, 923.712345, 938.769034, 950.787175, 970.515066, 995.54908, 1019.993524, 1049.335928, 1059.086495, 1080.855202, 1104.891483, 1123.224817, 1144.585361, 1159.64205, 1171.297379, 1183.179465, 1202.136381, 1227.896018, 1242.72595, 1260.095565, 1274.381279, 1289.301914, 1301.818921, 1321.047946, 1335.33366, 1352.068354, 1378.326857, 1403.050213, 1417.834794, 1437.217335, 1449.326178, 1465.69806, 1511.097153, 1541.294432, 1561.591484, 1578.961099, 1592.038196],
        "active": true
    },
    {
        "hymnId": "tai-shouri",
        "cantorId": "cantor-tharwat",
        "audioUrl": "CantorTharwat/CantorTharwat_MournfulTaishouri.mp3",
        "marks": [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165],
        "active": true
    },
    {
        "hymnId": "kata-ni-khoros",
        "cantorId": "hics",
        "audioUrl": "HICS/HICS_KataNiKhoros7egab.mp3",
        "marks": [0, 15, 30, 45, 60, 75, 90],
        "active": true
    },
    {
        "hymnId": "tai-shouri",
        "cantorId": "hics",
        "audioUrl": "HICS/HICS_MournfulTaishouri.mp3",
        "marks": [0, 15, 30, 45, 60, 75, 90, 105, 120, 135],
        "active": true
    },
    {
        "hymnId": "omonogenees",
        "cantorId": "hics",
        "audioUrl": "HICS/HICS_Omonogenees.mp3",
        "marks": [0, 15, 30, 45],
        "active": true
    },
    {
        "hymnId": "psalm-150",
        "cantorId": "cantor-ibrahim",
        "audioUrl": "CantorIbrahim/CantorIbrahim_Psalm150_Kiahk.mp3",
        "marks": [
            16.143336, 24.306601, 47.254447, 56.778256, 71.608188, 87.980071, 98.456261, 118.320207,
            139.635399, 148.252179, 161.909776, 180.639934, 197.238574, 208.576442, 223.950592,
            246.898438, 267.533359, 295.379163, 329.099003, 360.173833, 391.332563, 422.223719,
            452.362041, 482.699910, 514.316690, 544.386985, 570.409660, 596.797415, 625.278141,
            653.579728, 670.860907, 699.296282, 716.076327, 729.046849, 752.040046, 768.729388,
            782.289479, 797.255465, 810.135284, 825.509434, 843.468617, 866.869978, 890.094468,
            906.661361, 920.040046, 945.890386, 976.502631
        ],
        "active": true
    }
];
