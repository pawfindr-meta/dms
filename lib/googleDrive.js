import { google } from 'googleapis';
import path from 'path';
import { Readable } from 'stream';

export async function uploadTaskPhotoToDrive(fileBuffer, fileName, mimeType) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS || 'service-account.json'),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Convert Buffer to Readable Stream
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    const fileMetadata = {
      name: fileName,
      // Optional: Set parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] if you want to store in a specific folder
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