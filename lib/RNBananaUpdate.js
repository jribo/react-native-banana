const fs = require('fs');
const AdmZip = require('adm-zip');
const rimraf = require('rimraf');
const crypto = require('crypto');

class RNBananaUpdate {

  constructor(path) {
    this.isMain = true;
    this.zip = null;
    this.path = path;
  }

  extract(zipPath, outputPath = this.path) {
    this.zip = new AdmZip(zipPath);
    rimraf.sync(outputPath);
    this.zip.extractAllTo(outputPath, true);
    this.path = outputPath;
    if (this.isMain) {
      fs.mkdirSync(`${outputPath}/patches`);
    }
  }

  getAssets() {
    const rfred = (dir) => {
      return fs.readdirSync(`${this.path}/${dir}`).reduce((files, file) => ([
        ...files,
        ...(fs.lstatSync(`${this.path}/${dir}/${file}`).isDirectory() ? rfred(`${dir}/${file}`) : [{
          file: `${dir}/${file}`,
          signature: crypto.createHash('sha1').update(fs.readFileSync(`${this.path}/${dir}/${file}`)).digest('hex')
        }])
      ]), [])
    };
    return rfred(`assets`);
  }

  getSignature() {
    return fs.readFileSync(`${this.path}/main.signature`, 'utf8');
  }

  getBundle() {
    return fs.readFileSync(`${this.path}/main.jsbundle`, 'utf8');
  }



}

module.exports = RNBananaUpdate;