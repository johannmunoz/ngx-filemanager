import { take, map, tap, filter } from 'rxjs/operators';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as core from 'ngx-filemanager-core';
import { MakeClientDirectory } from '../utils/file.factory';
import { getFileIcon, getFolderIcon } from '../utils/icon-url-resolver';
import { ClientFileSystem } from './client-filesystem';
import { ClientCache } from './client-cache';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class ClientFileSystemService implements ClientFileSystem, OnDestroy {
  public $currentFiles = new BehaviorSubject<core.ResFile[]>([]);
  public $currentPath = new BehaviorSubject<string>(null);
  public $selectedFile = new BehaviorSubject<core.ResFile>(null);

  private folderCache = new ClientCache();

  // tslint:disable-next-line:member-ordering
  private static instanceCount = 0;
  private instanceCountIncr() {
    ClientFileSystemService.instanceCount++;
    this.logger.info('new instance created', {instances: this.instances});
  }
  private instanceCountDecr() {
    ClientFileSystemService.instanceCount--;
    this.logger.info('instance destroyed', {instances: this.instances});
  }
  get instances() {
    return ClientFileSystemService.instanceCount;
  }

  constructor(
    private logger: LoggerService,
  ) {
    this.instanceCountIncr();
  }

  ngOnDestroy() {
    this.instanceCountDecr();
  }

  async OnList(path: string): Promise<void> {
    this.$currentPath.next(path);
    const cachedFiles = this.folderCache.GetCached(path);
    this.$currentFiles.next(cachedFiles);
  }
  async OnCreateFolder(newPath: string): Promise<void> {
    const path = await this.$currentPath.pipe(take(1)).toPromise();
    const cachedFiles = this.folderCache.GetCached(path);
    const folderName = newPath.split('/').pop();
    const newFolder = MakeClientDirectory(folderName, newPath);
    cachedFiles.unshift(newFolder);
    this.folderCache.SetCached(path, cachedFiles);
    this.$currentFiles.next(cachedFiles);
  }
  async OnCopy(singleFileName: string, newPath: string): Promise<void> {}
  async OnMove(item: string, newPath: string): Promise<void> {
    await this.removeSingleFromList(item);
  }
  async OnRename(item: string, newItemPath: string): Promise<void> {}
  async OnEdit(item: string, content: string): Promise<void> {}
  async OnGetcontent(item: string): Promise<void> {}
  async OnSetPermissions(
    item: string,
    perms: string,
    permsCode: string,
    recursive?: boolean
  ): Promise<void> {}
  async OnMoveMultiple(items: string[], newPath: string): Promise<void> {
    await this.removeArrayFromList(items);
  }
  async OnCopyMultiple(items: string[], newPath: string): Promise<void> {}
  async OnSetPermissionsMultiple(
    items: string[],
    perms: string,
    permsCode: string,
    recursive?: boolean
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async OnRemove(items: string[]): Promise<void> {
    await this.removeArrayFromList(items);
  }
  async UpdateCurrentList(res: core.ResBodyList): Promise<void> {
    const path = await this.$currentPath.pipe(take(1)).toPromise();
    this.folderCache.SetCached(path, res.result);
    this.$currentFiles.next(res.result);
  }

  private async removeSingleFromList(filePath: string) {
    const path = await this.$currentPath.pipe(take(1)).toPromise();
    const cachedFiles = this.folderCache.GetCached(path);
    const itemName = this.GetFileNameFromPath(filePath);
    const cachedFilesWithout = cachedFiles.filter(f => f.name !== itemName);
    this.folderCache.SetCached(path, cachedFilesWithout);
    this.$currentFiles.next(cachedFilesWithout);
  }

  private EnsureNoTrailingSlash(inputPath: string): string {
    const hasTrailing = inputPath.slice(-1) === '/';
    const pathParsed = hasTrailing ? inputPath.slice(0, -1) : inputPath;
    return pathParsed;
  }

  private GetFileNameFromPath(inputPath: string): string {
    const safePath = inputPath || '';
    const parsedPath = this.EnsureNoTrailingSlash(safePath);
    const basename = parsedPath.split('/').pop();
    return basename;
  }

  private async removeArrayFromList(filePaths: string[]) {
    const path = await this.$currentPath.pipe(take(1)).toPromise();
    const cachedFiles = this.folderCache.GetCached(path);
    const removeSet = new Set(
      filePaths.map(filePath => this.GetFileNameFromPath(filePath))
    );
    const cachedFilesWithout = cachedFiles.filter(f => !removeSet.has(f.name));
    this.folderCache.SetCached(path, cachedFilesWithout);
    this.$currentFiles.next(cachedFilesWithout);
  }

  public get $FilesWithIcons(): Observable<core.ResFile[]> {
    return this.$currentFiles.pipe(
      map(files => (files ? files : [])),
      map(files => files.map(file => this.addIconPath(file))),
      map(files =>
        files.map(file => {
          return { ...file };
        })
      )
    );
  }

  public get $NoParentFolder() {
    return this.$currentPath.pipe(
      filter(p => !!p),
      map(path => path.split('/').length < 2)
    );
  }

  public onSelectItem(item: core.ResFile): any {
    this.$selectedFile.next(item);
  }

  private addIconPath(file: core.ResFile) {
    if (file.type === 'file') {
      file['icon'] = getFileIcon(file.name);
    } else {
      file['icon'] = getFolderIcon(file.name);
    }
    return file;
  }
}
