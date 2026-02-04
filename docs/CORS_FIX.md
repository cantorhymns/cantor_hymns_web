# Fixing the CORS Issue for Firebase Storage

The error `Failed to fetch` confirms that your app is being blocked by a security feature called CORS (Cross-Origin Resource Sharing).

This is not a bug in the application code. It's a security setting on your Google Cloud Storage bucket that needs to be configured once.

Here are the step-by-step instructions to fix it. You will need to have the [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed on your local machine.

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

- **`"origin": ["*"]`**: This allows any website to request files. This is safe because your `storage.rules` still protect against unauthorized uploads.
- **`"method": ["GET"]`**: This allows read-only access for downloading the files.

### Step 2: Apply the CORS Configuration

Open a terminal or command prompt on your local computer. Navigate to the directory where you saved the `cors.json` file (e.g., `cd Desktop`). Then, run the following command:

```bash
gcloud storage buckets update gs://studio-127742305-c9528.appspot.com --cors-file=cors.json
```

This command tells Google Cloud to apply the rules from your `cors.json` file to your project's default storage bucket.

### Step 3: Verify

After the command completes successfully, it may take up to a minute for the settings to apply. Refresh your app's web page, and the lyrics should now load correctly.

Once it's working, you can safely delete the `cors.json` file from your computer.