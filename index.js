const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const s3Client = new S3Client({
  region: 'us-east-1',
});

const downloadImage = async (bucket, key) => {
  const getObjectParams = {
    Bucket: bucket,
    Key: key,
  };

  try {
    const getObjectResponse = await s3Client.send(
      new GetObjectCommand(getObjectParams)
    );
    console.log(
      'Download has started. GetObjectResponse is:',
      getObjectResponse
    );
    return getObjectResponse.Body;
  } catch (err) {
    console.error('Download error:', err);
    throw err;
  }
};

const resizeImage = async (imageStream) => {
  console.log('Resizing started.');
  try {
    return await imageStream.pipe(sharp().resize({ height: 200 })).toBuffer();
  } catch (err) {
    console.error('Resize error:', err);
    throw err;
  }
};

const uploadImage = async (bucket, fileName, imageBuffer) => {
  const putObjectParams = {
    Bucket: bucket,
    Key: 'resized-images/' + fileName,
    Body: imageBuffer,
  };

  return s3Client
    .send(new PutObjectCommand(putObjectParams))
    .then((response) => {
      console.log('Upload successful:', response);
      return response;
    })
    .catch((err) => {
      console.error('Upload error: ' + err);
      throw err;
    });
};

exports.handler = async (event) => {
  console.log('Lambda function has been invoked.');
  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const key = record.s3.object.key;

    const fileNameWithoutPrefix = key.replace('original-files/', '');

    try {
      const downloadedImageBuffer = await downloadImage(bucketName, key);
      const resizedImageBuffer = await resizeImage(downloadedImageBuffer);
      await uploadImage(bucketName, fileNameWithoutPrefix, resizedImageBuffer);
    } catch (err) {
      console.error('Lambda error: ' + err);
      throw err;
    }
  }
};
