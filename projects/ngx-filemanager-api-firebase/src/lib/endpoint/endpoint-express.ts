// Add middle ware to this route
const express = require('express');
import * as Express from 'express';
import {
  OptionRequestsAreOk,
  PostRequestsOnly,
  HasBodyProp,
  HasQueryParam
} from './middleware-helpers';
import { FileManagerAction } from '../methods/core-types';
import { Storage } from '../methods/google-cloud-types';
import { NgxFileMangerApiFireBaseClass } from '../methods/firebase-storage-api';

let api: NgxFileMangerApiFireBaseClass;

const endpoint: Express.Application = express();
endpoint.use(OptionRequestsAreOk);

endpoint.get('/hello', async (req, res) => {
  console.log('HELLO');
  res.status(200).send('HELLO');
});

endpoint.use(PostRequestsOnly);

import 'multer';
const multer = require('multer');
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });
endpoint.post(
  '/upload',
  upload.array('files', 12),
  HasQueryParam('bucketname'),
  HasQueryParam('directoryPath'),
  (req, res, next) => {
    // req.files is array of `photos` files
    // req.body will contain the text fields, if there were any
    const files = req.files;
    if (Array.isArray(files)) {
      files.map(f => {
        const bucketname: string = req.params.bucketname;
        const directoryPath: string = req.params.directoryPath;
        api.HandleSaveFile(
          bucketname,
          directoryPath,
          f.originalname,
          f.mimetype,
          f.buffer
        );
      });
    }
  }
);

endpoint.use(
  '/',
  HasBodyProp('action'),
  HasBodyProp('bucketname'),
  async (req, res) => {
    const action: FileManagerAction = req.body.action;
    try {
      let body;
      switch (action) {
        case 'list':
          body = await api.HandleList(req.body);
          break;
        case 'rename':
          body = await api.HandleRename(req.body);
          break;
        case 'move':
          body = await api.HandleMove(req.body);
          break;
        case 'copy':
          body = await api.HandleCopy(req.body);
          break;
        case 'remove':
          body = await api.HandleRemove(req.body);
          break;
        case 'edit':
          body = await api.HandleEdit(req.body);
          break;
        case 'getContent':
          body = await api.HandleGetContent(req.body);
          break;
        case 'createFolder':
          body = await api.HandleCreateFolder(req.body);
          break;
        case 'changePermissions':
        case 'compress':
        case 'extract':
        case 'downloadMultiple':
        default:
          throw new Error('action has not been implemented');
      }
      res.status(200).send(body);
    } catch (error) {
      const returnedErrorMsg = `Bad request!
Error: ${error.msg},
body.action: ${req.body.action},
body: ${JSON.stringify(req.body)}
`;
      console.error({ returnedErrorMsg, error });
      res.status(400).send(returnedErrorMsg);
    }
  }
);
endpoint.use(notImplemented);

async function notImplemented(req, res) {
  const bodyString = JSON.stringify(req.body);
  res.status(501).send('That request has not been implemented: ' + bodyString);
}
/*
Use by attaching to a firebase function
exports.FileManagerApi = StorageEndpoint;
*/
export const FileManagerEndpointExpress = (storage: Storage) => {
  api = new NgxFileMangerApiFireBaseClass(storage);
  return endpoint;
};
