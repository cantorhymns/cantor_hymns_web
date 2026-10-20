import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';

// 245 refined marks from update-praxeon-ton-marks.ts
const marks245 = [
    12.768321, 22.019899, 29.412190, 40.341895, 49.457541, 56.577723, 65.693369, 76.260262, 88.233051, 98.573187, 107.774114, 115.302459, 135.166404, 141.560962, 149.905633, 157.297923, 168.551579, 178.574255, 188.687634, 203.614051, 214.543756, 226.380490, 232.865751, 241.754640, 250.190014, 258.942849, 272.412237, 280.802259, 290.779583, 297.899765, 302.661670, 316.302851, 328.955912, 335.078361, 350.494844, 360.732065, 366.095352, 375.709864, 382.149774, 389.094570, 401.152041, 410.588390, 417.267584, 427.970531, 439.308400, 452.037094, 457.811717, 470.918293, 476.224415, 484.024868, 493.276569, 500.548574, 510.237931, 522.074665, 531.974606, 537.598189, 545.942860, 549.965578, 554.863537, 562.119773, 570.827256, 577.614352, 587.047459, 598.133512, 608.181246, 613.415847, 620.989543, 630.785461, 634.867094, 647.997371, 665.366985, 673.802359, 680.469026, 684.550659, 694.975861, 710.799400, 721.547699, 727.987608, 742.854007, 750.563758, 756.232692, 763.851739, 772.751564, 783.545214, 794.157459, 800.642720, 811.799183, 822.547482, 832.169438, 839.854450, 845.523384, 866.831912, 876.083613, 881.072275, 886.469100, 896.310370, 903.430551, 912.772955, 922.115359, 928.872728, 943.203794, 949.280891, 956.945291, 965.380665, 985.817987, 992.736543, 998.607102, 1013.895697, 1025.653936, 1033.998608, 1044.066635, 1053.590444, 1067.966861, 1079.161372, 1088.957291, 1099.297427, 1107.685225, 1123.879028, 1136.894901, 1144.831409, 1154.254045, 1165.862595, 1172.529262, 1184.184591, 1191.848990, 1212.189513, 1223.020029, 1233.541571, 1242.566749, 1256.716409, 1282.042346, 1291.021938, 1300.545748, 1308.814617, 1325.110303, 1338.480582, 1346.224185, 1356.316472, 1393.661343, 1399.279693, 1425.228184, 1434.298479, 1444.389100, 1453.012300, 1467.105903, 1492.406154, 1509.050145, 1520.841528, 1526.691868, 1538.347197, 1545.240621, 1551.861936, 1556.124975, 1561.612503, 1569.004793, 1576.127973, 1584.835456, 1590.867202, 1603.918115, 1610.358025, 1617.795666, 1625.887016, 1646.691051, 1653.690398, 1659.383911, 1686.001415, 1693.212299, 1701.284862, 1707.271256, 1721.738376, 1747.135905, 1755.843388, 1768.483285, 1775.875575, 1790.026183, 1814.817894, 1825.612019, 1836.451021, 1842.301362, 1850.600681, 1858.830699, 1867.173704, 1880.325632, 1888.216788, 1897.937618, 1909.592947, 1916.489539, 1923.246908, 1935.673212, 1941.478201, 1956.758771, 1967.912838, 1979.930978, 1988.206244, 1997.049781, 2003.213186, 2010.876790, 2016.772482, 2022.441416, 2029.970185, 2038.169581, 2057.973346, 2064.552534, 2070.082190, 2095.014308, 2102.069888, 2114.633062, 2125.154604, 2133.181815, 2140.023499, 2150.197490, 2165.832522, 2174.948169, 2185.288305, 2196.825283, 2206.957134, 2215.936726, 2229.723574, 2242.500699, 2248.475052, 2263.707956, 2274.573459, 2284.369377, 2293.588593, 2318.758690, 2326.884640, 2330.822182, 2342.654928, 2353.940641, 2361.762765, 2367.407620, 2380.064330, 2385.884168, 2393.321810, 2401.572592, 2428.478487, 2459.483281, 2467.827952, 2476.807544, 2490.911853, 2516.651900, 2524.694359, 2532.726408, 2541.426275, 2549.044932
];

// Exact lyrics mapping for the 16 verses
const lyricsMarkersLines = [
    0,   // Verse 0: Ⲡ̀ⲣⲁⲝⲉⲱⲛ ⲧⲱⲛ ⲁ̀ⲅⲓⲱⲛ... (0:00)
    45,  // Verse 1: ⲉ̀ⲣⲉ ⲡⲟⲩⲥ̀ⲙⲟⲩ ⲉⲑ̅ⲩ̅ ϣⲱⲡⲓ ⲛⲉⲙⲁⲛ ⲁⲙⲏⲛ (07:19.31)
    109, // Verse 2: Ⲟⲩⲟϩ ⲛ̀ϩ̀ⲣⲏⲓ ⲇⲉ ϧⲉⲛ ⲛⲁⲓ ⲉ̀ϩⲟⲟⲩ ⲁϥⲧⲱⲛϥ ⲛ̀ϫⲉ Ⲡⲉⲧⲣⲟⲥ
    114, // Verse 3: ϧⲉⲛ ⲑ̀ⲙⲏϯ ⲛ̀ⲛⲓⲥ̀ⲛⲏⲟⲩ (17:59.16)
    127, // Verse 4: ⲛⲉ ⲟⲩⲟⲛ ⲟⲩⲙⲏϣ ⲇⲉ ⲉⲩⲑⲟⲩⲏⲧ... (20:23.02)
    131, // Verse 5: Ⲛⲓⲣⲱⲙⲓ ⲛⲉⲛⲥ̀ⲛⲏⲟⲩ: ϩⲱϯ ⲡⲉ... (21:22.04)
    146, // Verse 6: ⲫⲏⲉ̀ⲧⲁϥⲉⲣϭⲁⲩⲙⲱⲓⲧ ⲛ̀ⲛⲏⲉ̀ⲧⲁⲩⲁ̀ⲙⲟⲛⲓ ⲛ̀Ⲓⲏ̅ⲥ̅ (24:52.41)
    166, // Verse 7: Ϫⲉ ⲛⲁϥⲏⲡ ⲛ̀ϧ̀ⲣⲏⲓ ⲛ̀ϧⲏⲧⲉⲛ ⲡⲉ... (28:06.00)
    171, // Verse 8: Ⲫⲁⲓ ⲙⲉⲛ ⲟⲩⲛ ⲁϥϣⲱⲡ ⲛ̀ⲟⲩⲓⲟϩⲓ... (29:07.14)
    176, // Verse 9: ⲁⲩⲫⲱⲛ ⲉ̀ⲃⲟⲗ. Ⲟⲩⲟϩ ⲁϥⲟⲩⲱⲛϩ ⲉ̀ⲃⲟⲗ... (30:14.82)
    177, // Verse 10: ⲉⲧϣⲟⲡ ϧⲉⲛ Ⲓ̀ⲗⲏⲙ: ϩⲱⲥⲧⲉ ⲛ̀ⲥⲉⲙⲟⲩϯ... (30:25.61)
    205, // Verse 11: ϧⲉⲛ ⲧⲟⲩⲁⲥⲡⲓ ϫⲉ Ⲁ̀ⲭⲉⲗⲇⲁⲙⲁⲅ... (34:55.01)
    207, // Verse 12: Cⲥ̀ϧⲏⲟⲩⲧ ⲅⲁⲣ ϩⲓ ⲡ̀ϫⲱⲙ ⲛ̀ⲧⲉ ⲛⲓⲯⲁⲗⲙⲟⲥ (35:14.63)
    225, // Verse 13: ϫⲉ ⲧⲉϥⲉⲣⲃⲓ ⲙⲁⲣⲉⲥϣⲱϥ (38:38.76)
    237, // Verse 14: ⲟⲩⲟϩ ⲙ̀ⲡⲉⲛⲑ̀ⲣⲉϥϣⲱⲡⲓ ⲛ̀ϫⲉ ⲫⲏⲉⲧϣⲟⲡ ⲛ̀ϧⲏⲧⲥ... (40:59.48)
    241  // Verse 15: Ⲡⲓⲥⲁϫⲓ ⲇⲉ ⲛ̀ⲧⲉ Ⲡ̀ⲟ̅ⲥ̅ ⲉϥⲉ̀ⲁⲓⲁⲓ... (41:56.65)
];

async function publish() {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    console.log('Authenticating anonymously...');
    await signInAnonymously(auth);
    console.log('Authenticated.');

    // 1. Write staging files
    const markersDir = 'staging/markers/cantor-ibrahim';
    fs.mkdirSync(markersDir, { recursive: true });

    const markersContent = marks245.map(m => m.toFixed(6)).join('\n') + '\n';
    const markersPath = path.join(markersDir, 'cantor-ibrahim_praxeon-ton_markers.txt');
    fs.writeFileSync(markersPath, markersContent, 'utf-8');
    console.log(`Wrote ${marks245.length} markers to ${markersPath}`);

    const lyricsMarkersContent = lyricsMarkersLines.join('\n') + '\n';
    const lyricsMarkersPath = path.join(markersDir, 'cantor-ibrahim_praxeon-ton_lyrics_markers.txt');
    fs.writeFileSync(lyricsMarkersPath, lyricsMarkersContent, 'utf-8');
    console.log(`Wrote ${lyricsMarkersLines.length} lyrics markers to ${lyricsMarkersPath}`);

    // 2. Upload to Firebase Storage
    console.log('Uploading markers to Firebase Storage...');
    const markersStorageRef = ref(storage, 'markers/cantor-ibrahim/cantor-ibrahim_praxeon-ton_markers.txt');
    await uploadBytes(markersStorageRef, Buffer.from(markersContent, 'utf-8'), {
        contentType: 'text/plain; charset=utf-8'
    });
    console.log('Successfully uploaded cantor-ibrahim_praxeon-ton_markers.txt');

    console.log('Uploading lyrics markers to Firebase Storage...');
    const lyricsMarkersStorageRef = ref(storage, 'markers/cantor-ibrahim/cantor-ibrahim_praxeon-ton_lyrics_markers.txt');
    await uploadBytes(lyricsMarkersStorageRef, Buffer.from(lyricsMarkersContent, 'utf-8'), {
        contentType: 'text/plain; charset=utf-8'
    });
    console.log('Successfully uploaded cantor-ibrahim_praxeon-ton_lyrics_markers.txt');

    // 3. Update Firestore recording document
    const recordingDocId = 'cantor-ibrahim_praxeon-ton';
    const recordingRef = doc(db, 'recordings', recordingDocId);

    console.log(`Updating Firestore document ${recordingDocId}...`);
    await updateDoc(recordingRef, {
        markersUrl: 'markers/cantor-ibrahim/cantor-ibrahim_praxeon-ton_markers.txt',
        lyricsMappingUrl: 'markers/cantor-ibrahim/cantor-ibrahim_praxeon-ton_lyrics_markers.txt',
        mode: 'learn',
        active: true,
        audioLength: 2560.0261
    });
    console.log('Successfully updated Firestore document.');

    // 4. Verify download URLs
    const markersUrl = await getDownloadURL(markersStorageRef);
    const lyricsMarkersUrl = await getDownloadURL(lyricsMarkersStorageRef);
    console.log('Verification:');
    console.log('  Markers Download URL:', markersUrl);
    console.log('  Lyrics Markers Download URL:', lyricsMarkersUrl);

    const docSnap = await getDoc(recordingRef);
    console.log('  Updated Firestore Document:', JSON.stringify(docSnap.data(), null, 2));

    process.exit(0);
}

publish().catch(err => {
    console.error('Publish error:', err);
    process.exit(1);
});
