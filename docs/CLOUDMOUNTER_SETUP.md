# Connecting CloudMounter to Firebase Storage (S3 Method)

To connect Google Cloud Storage (GCS) in CloudMounter, you should use the **Amazon S3** connection option because GCS is S3-compatible.

## Step 1: Create HMAC Keys
1. Open the [Google Cloud Console Storage Settings](https://console.cloud.google.com/storage/settings).
2. Go to the **Interoperability** tab.
3. If you haven't enabled interoperability, click **Enable interoperability access**.
4. Under **HMAC keys for your user account**, click **Create a key**.
5. Save your **Access Key** and **Secret Key** immediately.

## Step 2: Configure CloudMounter
1. Open **CloudMounter** and click the **+** (plus) icon to add a new drive.
2. Select **Amazon S3** from the list of storage providers.

## Step 3: Enter Connection Details
1. **Connection Name**: Cantor Storage
2. **Server/Endpoint**: `https://storage.googleapis.com`
3. **Access Key**: [Enter the Access Key from Step 1]
4. **Secret Key**: [Enter the Secret Key from Step 1]

## Step 4: Mount
1. Click **Mount**.
2. Your storage buckets will now appear as a network drive. Locate the one named `studio-127742305-c9528.firebasestorage.app`.

**Note:** This is different from connecting to Google Drive, which is a separate consumer service. Always use the Amazon S3 option for your developer storage buckets.
