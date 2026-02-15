
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

const audioLengths: Record<string, number> = {
    'cantor-bola_alleluia-al-asr': 647.079175,
    'cantor-bola_entho-te-ti-shouri': 278.386925,
    'cantor-bola_kyrie-eleison-lent': 361.978775,
    'cantor-bola_meghalo': 1149.28325,
    'cantor-bola_mournful-tai-shouri': 701.49225,
    'cantor-bola_omonogenees': 967.4971666666667,
    'cantor-bola_psalm-150-lent-weekdays': 722.311825,
    'cantor-bola_share-ephnouti': 210.546925,
    'cantor-bola_somatos': 121.417125,
    'cantor-gad_genethlion': 705.854675,
    'cantor-gad_tarh': 1350.948583333334,
    'cantor-ibrahim_anok-pe-pi-kouji': 916.349375,
    'cantor-ibrahim_avechnon': 1186.1159,
    'cantor-ibrahim_ere-pi-esmou': 252.0032653061225,
    'cantor-ibrahim_ethvetee-general-funeral': 613.30285,
    'cantor-ibrahim_ethvetee-good-friday': 561.606525,
    'cantor-ibrahim_kata-ni-khoros': 746.0832916666667,
    'cantor-ibrahim_ke-eperto': 637.62285,
    'cantor-ibrahim_meghalo': 1028.49305,
    'cantor-ibrahim_mournful-agios': 1308.5257,
    'cantor-ibrahim_mournful-ti-shouri': 293.9559,
    'cantor-ibrahim_oukatee': 651.964075,
    'cantor-ibrahim_pek-ethronos': 1210.331425,
    'cantor-ibrahim_phai-etaf-enf': 459.493875,
    'cantor-ibrahim_praxeon-ton': 2560.0261,
    'cantor-ibrahim_psalm-150-kiahk': 1013.23755,
    'cantor-ibrahim_stones': 401.4759,
    'cantor-ibrahim_tarh': 1609.012291666667,
    'cantor-ibrahim_tribes': 421.694675,
    'cantor-ibrahim_yodas': 469.94285,
    'cantor-tharwat_avechnon': 1146.801625,
    'cantor-tharwat_ethvetee-general-funeral': 564.6105625,
    'cantor-tharwat_ethvetee-good-friday': 522.3183125,
    'cantor-tharwat_mournful-tai-shouri': 661.524875,
    'cantor-tharwat_mournful-ti-shouri': 374.46525,
    'cantor-tharwat_omonogenees': 858.72325,
    'cantor-tharwat_pek-ethronos': 1132.9305625,
    'cantor-tharwat_phai-etaf-enf': 399.3860625,
    'cantor-tharwat_ti-epistolee': 572.76,
    'hics_genethlion': 602.749375,
    'hics_kata-ni-khoros': 1289.3257,
    'hics_mournful-tai-shouri': 564.55835,
    'hics_omonogenees': 672.104475
};

async function updateAudioLengths() {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    try {
        console.log('Authenticating anonymously to update documents...');
        await signInAnonymously(auth);
        console.log('Authentication successful.');

        const batch = writeBatch(db);
        let updateCount = 0;

        console.log('Staging updates for audioLength field...');
        for (const [docId, length] of Object.entries(audioLengths)) {
            const docRef = doc(db, 'recordings', docId);
            batch.update(docRef, { audioLength: length });
            updateCount++;
        }

        if (updateCount > 0) {
            console.log(`Committing ${updateCount} updates...`);
            await batch.commit();
            console.log('All specified recordings have been updated with their audioLength.');
        } else {
            console.log('No recordings were specified to update.');
        }

    } catch (error) {
        console.error('An error occurred during the update process:', error);
    } finally {
        process.exit(0);
    }
}

updateAudioLengths();
