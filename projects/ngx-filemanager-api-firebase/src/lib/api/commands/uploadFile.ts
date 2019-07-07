import { permHelper } from './../../permissions/permissions-helper';
import { Bucket, File } from '../../types/google-cloud-types';
import * as path from 'path';
import { CoreTypes } from 'ngx-filemanager-core/public_api';
import { paths } from '../../utils/paths';
import { storage } from '../../utils/storage-helper';
import { sizeHelper } from '../../utils/size-helper';

export async function SaveBufferToPath(
  file: File,
  mimetype: string,
  buffer: Buffer
) {
  const fileOptions = {
    contentType: mimetype
  };
  console.log('uploadFile: SaveBufferToPath', { mimetype, path: file.name });
  return file.save(buffer, fileOptions);
}

export async function GetNextFreeFilename(
  bucket: Bucket,
  inputFile: File
): Promise<File> {
  const dirNameNoSuffix = paths.GetParentDir(inputFile.name);
  const childrenMatching = await storage.GetListWithoutPermissions(
    bucket,
    dirNameNoSuffix
  );
  if (!childrenMatching || !childrenMatching.length) {
    return inputFile;
  }
  const matchingNames = childrenMatching.map(f => f.fullPath).sort();
  const lastMatch = matchingNames.shift();
  const nextPath = paths.Add2ToPath(lastMatch);
  const nextFreeFile = bucket.file(nextPath);
  return nextFreeFile;
}

export async function UploadFile(
  bucket: Bucket,
  directoryPath: string,
  originalname: string,
  mimetype: string,
  buffer: Buffer,
  claims: CoreTypes.UserCustomClaims
) {
  const newPath = path.join(directoryPath, originalname);
  const bucketFilePath = paths.EnsureGoogleStoragePathFile(newPath);
  const desiredFile = bucket.file(bucketFilePath);
  try {
    let file: File;
    const [exists] = await file.exists();
    if (exists) {
      file = await GetNextFreeFilename(bucket, file);
    } else {
      file = desiredFile;
    }
    await SaveBufferToPath(file, mimetype, buffer);
    await sizeHelper.AddSizeToParents(bucket, file);
  } catch (error) {
    throw new Error('UploadFile: ' + error);
  }
}
