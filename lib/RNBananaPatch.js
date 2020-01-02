const fs = require('fs');
const DMP = require('diff-match-patch');
const diff = require("fast-array-diff");

const RNBananaUpdate = require('./RNBananaUpdate');

class RNBananaPatch extends RNBananaUpdate {

  constructor(path) {
    super(path);

    this.patch = null;
    this.assetPatch = null;
    this.isMain = false;

    if (fs.existsSync(this.path) && fs.existsSync(`${this.path}/main.patch`)) {
      this.patch = Buffer.from(fs.readFileSync(`${this.path}/main.patch`))
    }
  }

  getFileFromAsset(path) {
    return Buffer.from(fs.readFileSync(`${this.path}/${path}`))
  }

  checkPatchValid() {
    try {
      const dmp = new DMP()
      const patchContent = fs.readFileSync(`${this.path}/main.patch`, 'utf8');
      dmp.patch_fromText(patchContent)
      console.log('Patchfile is valid')
      return true;
    } catch (e) {
      return false;
    }
  }

  from(patch) {
    const dmp = new DMP()
    const patchArr = dmp.patch_make(patch.getBundle().toString(), this.getBundle().toString());
    this.patch = dmp.patch_toText(patchArr);

    const oldAssets = patch.getAssets();
    const newAssets = this.getAssets();
    const assetDiff = diff.getPatch(oldAssets, newAssets, function compare(a, b) {
      return a.file === b.file && a.signature === b.signature
    });
    this.assetPatch = assetDiff;

    fs.writeFileSync(`${this.path}/main.patch`, Buffer.from(this.patch));
    fs.writeFileSync(`${this.path}/assets.patch`, JSON.stringify(this.assetPatch));

  }

}

module.exports = RNBananaPatch;