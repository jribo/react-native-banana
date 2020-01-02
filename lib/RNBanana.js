const fs = require('fs');
const AdmZip = require('adm-zip');
const crypto = require('crypto');
const mkdirp = require('mkdirp');

const RNBananaUpdate = require('./RNBananaUpdate');
const RNBananaPatch = require('./RNBananaPatch');

class RNBanana {

  constructor({ storagePath, tmpPath, updatesPath, version, zipPath }) {
    this.version = version || null;
    this.patches = [];
    this.storagePath = storagePath;
    this.tmpPath = tmpPath;
    this.updatesPath = updatesPath;
    this.instanciateUpdate();
  }

  instanciateUpdate() {
    if (!fs.existsSync(this.storagePath)) mkdirp.sync(this.storagePath);
    if (!fs.existsSync(this.tmpPath)) mkdirp.sync(this.tmpPath);
    if (!fs.existsSync(this.updatesPath)) mkdirp.sync(this.updatesPath);

    this.update = new RNBananaUpdate(`${this.storagePath}/${this.version}`);
    this.patches = !fs.existsSync(`${this.storagePath}/${this.version}`) ? [] : fs
      .readdirSync(`${this.storagePath}/${this.version}/patches`)
      .map((patchNumber) => {
        return new RNBananaPatch(`${this.storagePath}/${this.version}/patches/${patchNumber}`);
      })
  }

  versionExists() {
    return fs.existsSync(`${this.storagePath}/${this.version}`);
  }

  createUpdate(path) {
    this.update.extract(path, `${this.storagePath}/${this.version}`);
    this.patches = fs
      .readdirSync(`${this.storagePath}/${this.version}/patches`)
      .map((patchNumber) => {
        return new RNBananaPatch(`${this.storagePath}/${this.version}/patches/${patchNumber}`);
      });
    return this.update;
  }

  createPatch(path) {
    const patchDestinationPath = `${this.storagePath}/${this.version}/patches/${this.patchIndex()}`;
    const patch = new RNBananaPatch(`${this.tmpPath}/${this.version}`);
    patch.extract(path, `${this.tmpPath}/${this.version}`);

    const patchSignature = patch.getSignature().toString();

    if (this.update.getSignature().toString() === patchSignature) {
      throw new Error("Trying to patch with the same update's signature.");
    }

    const patchExists = this.patches.find((existingPatch) => existingPatch.getSignature().toString() === patchSignature);

    if (patchExists) {
      throw new Error("Trying to patch an existing patch.");
    }

    patch.extract(path, patchDestinationPath)

    this.patches.push(patch);
    this.getPatch(patchSignature);

    return patch;
  }

  load(path) {
    if (!path) {
      throw new Error("Path of the zip to upgrade is required");
    }

    const shouldCreateVersion = !this.versionExists();
    if (shouldCreateVersion) {
      return this.createUpdate(path);
    }

    return this.createPatch(path);

  }

  patchIndex() {
    return this.patches.length <= 0 ? 1 : this.patches.length + 1;
  }

  getPatch(patchSignature) {
    const isMainUpdate = this.update.getSignature().toString() === patchSignature;
    const patchIndex = this.patches.findIndex((existingPatch) => {
      return existingPatch.getSignature().toString() === patchSignature;
    });
    const requiredPatches = [];

    let patches = [];
    let fromPatch = null;

    if (!isMainUpdate && patchIndex < 0) {
      throw new Error("No patch found with that signature");
    }

    if (isMainUpdate) {
      patches = this.patches.slice(patchIndex + 1, this.patches.length);
      fromPatch = this.update;
    } else if (patchIndex !== -1) {
      const isLastPatch = this.patches.length === patchIndex + 1 && this.patches.length > 1;
      if (isLastPatch) {
        patches = [this.patches[patchIndex]];
        fromPatch = this.patches[patchIndex - 1];
      } else {
        patches = this.patches.slice(patchIndex + 1, this.patches.length);
        fromPatch = this.patches[patchIndex];
      }
    }

    do {
      const [patch] = patches.splice(0, 1);
      if (patch && fromPatch && patch.getSignature() !== patchSignature) {
        //THIS IS INCORRECT, BECAUSE ITS ALWAYS FETCHING THE SAME FROM PATCH
        // IS SHOULD FETCH THE PREVIOUSLY GENERATED OR THE DEFINED PATCH
        patch.from(fromPatch);
        requiredPatches.push(patch);
        fromPatch = patch;
      }
    } while (patches.length > 0)

    return requiredPatches;
  }

  generateUpdate(updatePath, destinationPath) {
    try {
      if (fs.existsSync(destinationPath) === false) {
        throw new Error("File does not exist.");
      }

      const zip = new AdmZip();
      const bundle = fs.readFileSync(`${updatePath}/main.jsbundle`);
      const sha1 = crypto.createHash('sha1').update(bundle).digest('hex');

      zip.addFile('main.signature', sha1);
      zip.addLocalFolder(`${updatePath}`);

      return Promise.resolve(zip.toBuffer());
    } catch (err) {
      return Promise.reject(err);
    }
  }

  pack(signature, destinationPath) {
    const zip = new AdmZip();
    const requiredPatches = this.getPatch(signature);
    if (requiredPatches.length <= 0) {
      throw new Error("Already up to date.");
    }
    requiredPatches.forEach((patch, i) => {
      patch.assetPatch.filter(({ type }) => type === 'add').forEach((asset) => {
        const [{ file }] = asset.items;
        const fileBuffer = patch.getFileFromAsset(file);
        zip.addFile(`asset-${i}/${file}`, fileBuffer);
      });
      zip.addFile(`update-${signature}-${i + 1}.patch`, patch.patch);
      zip.addFile(`update-${signature}-${i + 1}.asset.patch`, patch.assetPatch);
    });


    if (!destinationPath) {
      return zip.toBuffer();
    }

    fs.writeFileSync(destinationPath, zip.toBuffer());

    return;
  }
}


module.exports = RNBanana;