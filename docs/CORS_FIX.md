# Fixing the CORS Issue for Firebase Storage

The error `Failed to fetch` confirms that your app is being blocked by a security feature called CORS (Cross-Origin Resource Sharing). This is not a bug in the application code; it's a security setting on your Google Cloud Storage bucket that needs to be configured once.

**Why the Google Cloud Console?**
Firebase Storage is built directly on top of Google Cloud Storage. While the Firebase Console is great for everyday tasks, some advanced settings like CORS are managed in the more powerful Google Cloud Console. The link below will take you to the correct page for your project's storage bucket.

You can fix this using either the web-based Google Cloud Console or the command-line interface (CLI).

---

## Option 1: Using the Google Cloud Console (Web Browser)

This method uses the graphical user interface and doesn't require any local tools.

1.  **Open the Google Cloud Console**: Navigate to the Cloud Storage browser for your project by clicking this link:
    [https://console.cloud.google.com/storage/browser/studio-127742305-c9528.appspot.com](https://console.cloud.google.com/storage/browser/studio-127742305-c9528.appspot.com)

2.  **Go to Permissions**: Select the **Permissions** tab.

3.  **Find CORS Configuration**: Scroll down to the "Cross-origin resource sharing (CORS)" section and click the **Edit** button.

4.  **Add a New Entry**: Click **Add an entry**. A form will appear. Fill it out as follows:
    *   **Origin**: Enter `*` (a single asterisk). This allows any website to request files.
    *   **Methods**: Check the box for `GET`. This allows read-only access for downloading files.
    *   **Max-age (seconds)**: Enter `3600`.

5.  **Save**: Click the **Save** button.

It may take a minute for the settings to apply. After saving, refresh your app's web page, and the lyrics should now load correctly.

---

## Option 2: Using the Google Cloud CLI (Command Line)

This method is faster if you have the [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed.

### Step 1: Create a `cors.json` file

Create a new file on your local computer (e.g., on your Desktop) and name it `cors.json`. Paste the exact following content into this file:

```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

### Step 2: Apply the CORS Configuration

Open a terminal or command prompt on your local computer. Then, run the following command:

```bash
gcloud storage buckets update gs://studio-127742305-c9528.appspot.com --cors-file=cors.json
```

This command tells Google Cloud to apply the rules from your `cors.json` file to your project's default storage bucket.

### Step 3: Verify

After the command completes successfully, it may take up to a minute for the settings to apply. Refresh your app's web page, and the lyrics should now load correctly. You can safely delete the `cors.json` file from your computer after the fix is confirmed.
