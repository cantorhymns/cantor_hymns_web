# Connecting Mountain Duck to Firebase Storage

To manage your audio and image files directly from your computer's file explorer using Mountain Duck, follow these steps:

## Step 1: Add New Bookmark
1. Open **Mountain Duck**.
2. Click the **+** (plus) icon or select **New Bookmark**.
3. Select **Google Cloud Storage** from the service dropdown.

## Step 2: Authentication
1. Mountain Duck will prompt you to log in via your web browser.
2. Log in with the **Google account** that owns your Firebase project.
3. Grant Mountain Duck permission to access your Google Cloud Storage resources.

## Step 3: Connection Details
1. **Nickname**: Cantor Storage
2. **Project ID**: `studio-127742305-c9528`
3. **Path**: You can leave this blank to see all buckets, or enter the specific bucket name: `/studio-127742305-c9528.firebasestorage.app`

## Step 4: Mount
1. Click **Connect**.
2. The storage bucket will now appear as a mounted network drive in your Finder (Mac) or File Explorer (Windows).

## Folder Structure
Once mounted, please ensure you use the following folders to keep the app working correctly:
- `/tracks/`: For your MP3 audio files.
- `/markers/`: For your `.txt` marker files.
- `/lyrics/`: For your `.md` markdown lyric files.
- `/backgrounds/`: For genre background images.

**Note:** If you encounter permission errors, ensure your Google account has the **Storage Admin** role assigned in the [IAM section of the Google Cloud Console](https://console.cloud.google.com/iam-admin/iam).
