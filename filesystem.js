// fileSystem.js
class FileSystem {
  constructor(model, options) {
    this.model = model;
    this.options = options || {};
  }

  static async create(config) {
    const { model, ...options } = config;
    switch (model) {
      case 'localStorage':
        return new LocalStorageFileSystem(options);
      case 'sessionStorage':
        return new SessionStorageFileSystem(options);
      case 'file':
        return new FileSystemInput(options);
      case 'google-drive':
        return new GoogleDriveFileSystem(options);
      case 'jszip':
        return new JSZipFileSystem(options);
      default:
        throw new Error(`Unsupported file system model: ${model}`);
    }
  }

  async read_content(filename) {
    throw new Error('Not implemented');
  }

  async write_content(filename, content) {
    throw new Error('Not implemented');
  }

  async read_object(filename) {
      const content = await this.read_content(filename);
      return content === undefined ? undefined : JSON.parse(content);
  }

  async write_object(filename, obj) {
    await this.write_content(filename, JSON.stringify(obj));
  }

  async list(dir) {
    throw new Error('Not implemented');
  }

  async delete(filename) {
      throw new Error('Not implemented');
  }
}

// Implementations for each model

// 1. localStorage
class LocalStorageFileSystem extends FileSystem {
  constructor(options) {
    super('localStorage', options);
    this.prefix = options.prefix || ''; // Add prefix support
  }

  async read_content(filename) {
    const content = localStorage.getItem(this.prefix + filename);
    return content === null ? undefined : content;
  }

  async write_content(filename, content) {
    localStorage.setItem(this.prefix + filename, content);
  }

  async list(dir) {
    const files = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.prefix)) {
        files.push({ type: 'file', filename: key.slice(this.prefix.length) });
      }
    }
    return files;
  }

    async delete(filename) {
        localStorage.removeItem(this.prefix + filename);
    }
}

// 2. sessionStorage
class SessionStorageFileSystem extends FileSystem {
  constructor(options) {
    super('sessionStorage', options);
    this.prefix = options.prefix || ''; // Add prefix support
  }

  async read_content(filename) {
    const content = sessionStorage.getItem(this.prefix + filename);
    return content === null ? undefined : content;
  }

  async write_content(filename, content) {
    sessionStorage.setItem(this.prefix + filename, content);
  }

  async list(dir) {
    const files = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key.startsWith(this.prefix)) {
        files.push({ type: 'file', filename: key.slice(this.prefix.length) });
      }
    }
    return files;
  }

    async delete(filename) {
        sessionStorage.removeItem(this.prefix + filename);
    }
}

// 3. File (using <input> and download)
class FileSystemInput extends FileSystem {
    constructor(options) {
        super('file', options);
    }

    async read_content(filename) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = this.options.accept || '*';

            input.onchange = async (event) => {
                const file = event.target.files[0];

                if (!file) {
                    reject(new Error("没有选择文件喵!"));
                    return;
                }

                const reader = new FileReader();

                reader.onload = async (e) => {
                    const arrayBuffer = e.target.result;
                    const mimeType = file.type || 'application/octet-stream'; // 获取文件的 MIME 类型，或者使用默认值

                    const blob = new Blob([arrayBuffer], { type: mimeType });

                    const blobFunc = async () => blob;

                    const textFunc = async () => {
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsText(blob);
                        });
                    };

                    const loadzipFunc = async () => {
                        if (typeof JSZip === 'undefined') {
                            throw new Error("JSZip 未定义喵! 需要先引入 JSZip 库哦!");
                        }
                        try {
                            const zip = await JSZip.loadAsync(blob);
                            return zip;
                        } catch (error) {
                            throw new Error("加载 JSZip 失败喵!" + error.message);
                        }
                    };

                    resolve({
                        blob: blobFunc,
                        text: textFunc,
                        loadzip: loadzipFunc,
                        json: async () => JSON.parse(await textFunc()),
                    });

                };

                reader.onerror = (e) => {
                    reject(e);
                };

                reader.readAsArrayBuffer(file); // 使用 readAsArrayBuffer
            };

            input.click();
        });
    }

    async write_content(filename, content) {
        const blob = new Blob([content], { type: this.options.contentType || 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async list(dir) {
        return []; // Not supported
    }

    async delete(filename){
      //Do nothing, local files do not persist, cannot be deleted.
    }
}

// 4. Google Drive (Simplified)
class GoogleDriveFileSystem extends FileSystem {
  constructor(options) {
    super('google-drive', options);
    this.folderId = options.folderId; // Add folderId option
  }

  async read_content(filename) {
    try {
      const fileId = await this.getFileId(filename);
      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });
      return response.body;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  async write_content(filename, content) {
    try {
      const fileId = await this.getFileId(filename);
      const blob = new Blob([content], { type: 'text/plain' }); // Adjust mime type as needed

      const metadata = {
        name: filename,
        parents: [this.folderId || await this.createOrGetFolder()], // Use folderId or default folder
      };

      const media = {
        mimeType: 'text/plain', // Adjust mime type as needed
        body: blob,
      };

      let response;

      if (fileId) {
        // Update existing file
        response = await gapi.client.drive.files.update({
          fileId: fileId,
          resource: metadata,
          media: media,
        });
      } else {
        // Create new file
        response = await gapi.client.drive.files.create({
          resource: metadata,
          media: media,
          fields: 'id', // Request the 'id' field in the response
        });
      }

      const newFileId = response.result.id || fileId;
      return newFileId; // return the file ID
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  }

  async list(dir) {
    try {
      const folderId = this.folderId || await this.createOrGetFolder();
      const response = await gapi.client.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType)',
      });

      const files = response.result.files;
      return files.map(file => ({
        type: file.mimeType === 'application/vnd.google-apps.folder' ? 'dir' : 'file',
        filename: file.name,
        id: file.id, // Include the file ID for later use
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

    async delete(filename) {
        try {
            const fileId = await this.getFileId(filename);
            if (!fileId) {
                throw new Error(`File "${filename}" not found in Google Drive.`);
            }
            await gapi.client.drive.files.delete({ fileId: fileId });
        } catch (error) {
            console.error("Error deleting file:", error);
            throw error;
        }
    }

  // Helper functions

  async getFileId(filename) {
    try {
      const folderId = this.folderId || await this.createOrGetFolder();

      const response = await gapi.client.drive.files.list({
        q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id)',
      });

      const files = response.result.files;
      return files.length > 0 ? files[0].id : null;
    } catch (error) {
      console.error('Error getting file ID:', error);
      return null; // Or throw an error if appropriate
    }
  }

  async createOrGetFolder(folderName = 'My App Folder') {
    try {
      const folderId = await this.findFolder(folderName);

      if (folderId) {
        return folderId;
      } else {
        const fileMetadata = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        };

        const response = await gapi.client.drive.files.create({
          resource: fileMetadata,
          fields: 'id',
        });

        return response.result.id;
      }
    } catch (error) {
      console.error('Error creating or getting folder:', error);
      throw error;
    }
  }

  async findFolder(folderName) {
    const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;

    try {
      const response = await gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name)',
      });

      const files = response.result.files;
      return files && files.length > 0 ? files[0].id : null;
    } catch (error) {
      console.error('Error searching for folder:', error);
      return null;
    }
  }
}

// 5. JSZip File System
class JSZipFileSystem extends FileSystem {
  constructor(options) {
    super('jszip', options);
    this.zip = new JSZip(); // Create a new JSZip object
  }

  async read_content(filename) {
    try {
      const file = this.zip.file(filename);
      if (!file) {
        return undefined; // File not found
      }
      return await file.async('string'); // Read as text
    } catch (error) {
      console.error('Error reading file from zip:', error);
      throw error;
    }
  }

  async write_content(filename, content) {
    try {
      this.zip.file(filename, content);
    } catch (error) {
      console.error('Error writing file to zip:', error);
      throw error;
    }
  }

  async list(dir) {
    // JSZip doesn't directly support directories in the same way as a file system.
    // We'll iterate over the files in the zip and return those that start with the given directory.

    const files = [];
    this.zip.forEach((relativePath, zipEntry) => {
      if (relativePath.startsWith(dir)) {
        const filename = relativePath;

        let type = 'file';
        if (relativePath.endsWith('/')) {
          type = 'dir';
        }

        files.push({ type: type, filename: filename });

      }
    });
    return files;
  }

  async generate() {
    try {
        const content = await this.zip.generateAsync({ type: "blob" });
        return content;
    } catch (error) {
        console.error("Error generate zip file:", error);
        throw error;
    }
  }

    async save(filename) {
      try {
          const content = await this.zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(content);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a); // Required for Firefox
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      } catch (error) {
          console.error("Error saving zip file:", error);
          throw error;
      }
    }

    async load(blob) {
        try {
            this.zip = await new JSZip().loadAsync(blob); // Reset zip object on load
        } catch (error) {
            console.error("Error loading zip file:", error);
            throw error;
        }
    }

    async delete(filename) {
        try {
            this.zip.remove(filename);
        } catch (error) {
            console.error("Error deleting file from zip:", error);
            throw error;
        }
    }
}


export default FileSystem;