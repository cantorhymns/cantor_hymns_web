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

## Troubleshooting Permission Errors
If you see an error saying **"You don’t have permission to view it"** or **"Verify disk permissions"** in Finder, this is a Google Cloud IAM issue. Follow these exact steps to fix it:

1.  **Open the IAM Console**: Go to the [Google Cloud IAM page](https://console.cloud.google.com/iam-admin/iam?project=studio-127742305-c9528).
2.  **Find your account**: Look for your email address in the list of principals.
3.  **Edit Permissions**: Click the **pencil icon** (Edit principal) next to your email.
4.  **Add Role**: Click **+ ADD ANOTHER ROLE**.
5.  **Select Storage Admin**: Search for **"Storage Admin"** and select it. This specific role is required for Mountain Duck to list and manage files across the whole bucket.
6.  **Save**: Click **Save**.
7.  **Reconnect**: In Mountain Duck, **Disconnect** and then **Connect** again. It may take up to a minute for the new permissions to propagate.

**Note:** Newer Firebase projects use "Uniform" access control by default, which means object-level permissions won't work; you MUST have the project-level role assigned above.
