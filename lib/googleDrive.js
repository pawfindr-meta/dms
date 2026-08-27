import { google } from 'googleapis';
import path from 'path';
import { Readable } from 'stream';

function getGoogleDriveAuth() {
  const base64Key =
    process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;

  // 1. Production / Vercel (Base64 Environment Variable)
  if (base64Key) {
    const decodedJson = Buffer.from(base64Key.trim(), 'base64').toString('utf-8');
    const credentials = JSON.parse(decodedJson);

    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    return new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  }

  // 2. Local Development Fallback
  return new google.auth.GoogleAuth({
    keyFile: path.resolve(
      process.cwd(),
      process.env.GOOGLE_APPLICATION_CREDENTIALS || 'service-account.json'
    ),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

export async function uploadTaskPhotoToDrive(fileBuffer, fileName, mimeType) {
  try {
    const auth = getGoogleDriveAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Convert Buffer to Readable Stream
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    const fileMetadata = {
      name: fileName,
      ...(process.env.GOOGLE_DRIVE_FOLDER_ID
        ? { parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] }
        : {}),
    };

    const media = {
      mimeType: mimeType || 'image/jpeg',
      body: stream,
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // Make file accessible via link
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      fileId: file.data.id,
      driveUrl: file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}/view`,
    };
  } catch (error) {
    console.error('Google Drive Upload Error:', error.message);
    throw error;
  }
}