
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    18.548753, 26.266653, 43.177204, 63.877336, 73.763958, 90.498652, 107.342189, 124.485046, 137.650579,
    149.033799, 159.360051, 166.403414, 181.233346, 195.201599, 209.305908, 233.970028, 252.246672,
    261.815833, 275.511979, 286.350981, 296.237602, 310.795425, 325.580006, 334.967761, 357.779552,
    377.734201, 396.373657, 417.053929, 430.432613, 449.888396, 468.346446, 489.979099, 508.936015,
    524.400867, 548.593108, 562.470659, 572.765443, 586.098777, 596.302858, 606.869752, 622.833471,
    635.305126, 646.960455, 662.017144, 672.992201, 685.554559, 706.597643, 733.173607, 749.515066,
    760.172662, 767.973116, 782.032073, 796.317787, 808.471982, 827.930032, 858.088762, 883.304182,
    896.093297, 909.562685, 923.712345, 938.769034, 950.787175, 970.515066, 995.549080, 1019.993524,
    1049.335928, 1059.086495, 1080.855202, 1104.891483, 1123.224817, 1144.585361, 1159.642050,
    1171.297379, 1183.179465, 1202.136381, 1227.896018, 1242.725950, 1260.095565, 1274.381279,
    1289.301914, 1301.818921, 1321.047946, 1335.333660, 1352.068354, 1378.326857, 1403.050213,
    1417.834794, 1437.217335, 1449.326178, 1465.698060, 1511.097153, 1541.294432, 1561.591484,
    1578.961099, 1592.038196
];

async function updateMarks() {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    try {
        console.log('Authenticating anonymously to perform update...');
        await signInAnonymously(auth);
        console.log('Authentication successful.');

        const recordingsRef = collection(db, 'recordings');
        const q = query(recordingsRef, where('hymnId', '==', 'tarh'), where('cantorId', '==', 'cantor-ibrahim'));

        console.log("Searching for the 'Tarh' recording by 'Cantor Ibrahim'...");
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error("Error: Could not find the specified recording. No documents match the query.");
            return;
        }

        if (querySnapshot.size > 1) {
            console.warn("Warning: Found multiple recordings matching the criteria. Updating all of them.");
        }

        for (const doc of querySnapshot.docs) {
            console.log(`Found recording with ID: ${doc.id}. Updating marks...`);
            await updateDoc(doc.ref, {
                marks: newMarks
            });
            console.log(`Successfully updated marks for document ${doc.id}.`);
        }

        console.log('Update script finished.');

    } catch (error) {
        console.error('An error occurred during the update process:', error);
    } finally {
        process.exit(0);
    }
}

updateMarks();
