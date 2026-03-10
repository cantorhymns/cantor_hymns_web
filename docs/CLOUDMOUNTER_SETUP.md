# Connecting CloudMounter to Firebase Storage

To manage your audio and image files directly from your computer's file explorer using CloudMounter, follow these steps:

## Step 1: Add New Connection
1. Open **CloudMounter**.
2. Click the **+** (plus) icon to add a new drive.
3. Select **Google Cloud Storage** from the list of storage providers.

## Step 2: Authentication
1. CloudMounter will open a browser window for Google OAuth.
2. Log in with the **Google account** that owns your Firebase project.
3. Grant CloudMounter permission to access your storage.

## Step 3: Connection Details
1. **Connection Name**: Cantor Storage
2. **Project ID**: `studio-127742305-c9528`
3. **Bucket**: Locate and select the bucket named `studio-127742305-c9528.appspot.com`.

## Step 4: Mount
1. Click **Mount**.
2. The storage bucket will now appear as a regular network drive on your Mac or PC.

## Working with Files
You can now drag and drop files into the folders we've established:
- `/tracks/`: For your MP3 audio files.
- `/markers/`: For your `.txt` marker files.
- `/lyrics/`: For your `.md` markdown lyric files.
- `/backgrounds/`: For genre background images.

**Note:** If you see an "Access Denied" or "Forbidden" error, verify that your account has the **Storage Admin** role in the [Google Cloud Console](https://console.cloud.google.com/iam-admin/iam) for this project.
