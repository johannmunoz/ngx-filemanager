import {Observable} from 'rxjs';

export interface NameUid {
  name: string;
  uid: string;
}

export interface FileManagerConfig {
  virtualRoot: string; // Users can't navigate above this root

  bucketName: string; // For uploads
  firebaseConfig: {}; // For uploads

  disableLogging?: boolean;
  initialPath?: string;

  isAdmin?: boolean;

  users?: Observable<NameUid[]>;
  groups?: Observable<NameUid[]>;
  me?: Observable<NameUid>;

  showWriters?: boolean;
  showOthers?: boolean;
}
