# Understanding Your App's Costs

This document provides a breakdown of how your application's usage translates into potential costs. Your project runs on Firebase, which operates on a pay-as-you-go model after a generous free tier is exceeded.

For this specific application, your costs are primarily driven by three services:
1.  **Cloud Firestore** (your database)
2.  **Cloud Storage for Firebase** (your audio and image files)
3.  **App Hosting** (serving the website itself)

---

### 1. Cloud Firestore (The Database)

Firestore is where all your app's data (genres, hymns, cantors, recordings) is stored.

*   **How it's billed:** Primarily by the number of **document reads, writes, and deletes**.
*   **How your app uses it:**
    *   When a user loads the homepage, the app **reads** all documents from the `genres` collection.
    *   When a user clicks on a genre (e.g., "Holy Week"), the app **reads** all `hymn` documents for that genre and the related `recording` documents.
    *   When a user opens the hymn player, the app **reads** the specific `hymn` document, its `recording` documents, and the associated `cantor` documents.
*   **Impact of Traffic:** More users browsing your site will directly increase the number of document reads, which is the main cost driver for Firestore.

---

### 2. Cloud Storage for Firebase (Files & Audio)

Cloud Storage is where your large files, like MP3s and background images, are stored.

*   **How it's billed:** Primarily by the amount of data **downloaded** (also called "egress" or "bandwidth"). There is also a small monthly fee for the total amount of data stored (in GB).
*   **How your app uses it:**
    *   This is likely your **biggest potential cost driver.** Every time a user plays a hymn, their browser **downloads** the entire MP3 audio file.
    *   When the homepage loads, the background images for each genre are **downloaded**.
*   **Impact of Traffic:** More users listening to hymns will significantly increase your data download usage. A 5 MB hymn listened to by 200 users amounts to 1 GB of data downloaded.

---

### 3. App Hosting (The Website)

App Hosting is the service that runs your Next.js code and serves the website to your users.

*   **How it's billed:** Based on the compute resources consumed, such as CPU time and memory, as well as the number of requests (invocations).
*   **Impact of Traffic:** Higher traffic means the service needs to do more work to serve pages to every user, which can increase costs if you go beyond the free tier.

---

### 4. Firebase Authentication (User Sign-in)

*   **How it's billed:** Your app uses Anonymous Authentication. This is **free** up to a very high limit (millions of users per month).
*   **Impact of Traffic:** This service is unlikely to be a cost factor for your app.

---

## Summary & The Free Tier

It's crucial to remember that **you only pay for what you use *after* exceeding the Firebase "Spark Plan" free tier.** This free tier is generous and includes a monthly allowance for:

*   Firestore document reads/writes
*   Cloud Storage downloads (GB/month)
*   App Hosting resources

**Recommendation:** To monitor your usage and see how close you are to the free tier limits, you should regularly check the **Usage and billing** section of your Firebase project console. This will give you the most accurate picture of your app's consumption.