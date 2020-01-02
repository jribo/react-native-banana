const { resolve, basename } = require('path');
const { fs } = require('mz');
const invariant = require('invariant');
const DMP = require('diff-match-patch');
const fss = require('fs');
const AdmZip = require('adm-zip'); // a module for extracting files
const crypto = require('crypto');

const findFile = (path) => resolve(__dirname, path);
const bp = (file) => require('path').join(__dirname, "..", file);
const btemp = (file) => require('path').join("/tmp", file);

async function generatePatch(oldFilePath, newFilePath, opt = {}) {
  const dmp = new DMP()
  const oldBundle = await checkFileIsExisted(findFile(oldFilePath))
  const newBundle = await checkFileIsExisted(findFile(newFilePath))
  const patchFileName = opt.output || `${basename(oldFilePath)}-${basename(newFilePath)}.patch`
  const patchArr = dmp.patch_make(oldBundle, newBundle)
  await fs.writeFile(resolve(__dirname, patchFileName), dmp.patch_toText(patchArr), 'utf8')
}

const checkFileIsExisted = async (path) => {
  invariant(await fs.exists(path), `File：${path} is not found`)
  return fs.readFile(path, 'utf8')
}

exports.processUpdate = async (version, path) => {
  try {
    if (fss.existsSync(path) === false) {
      throw new Error("File does not exist.");
    }
    const zip = new AdmZip(path);
    if (!fss.existsSync(bp(`./tmp/${version}`))) {
      fss.mkdirSync(bp(`./tmp/${version}`));
      zip.extractAllTo(bp(`./tmp/${version}`));
      fss.mkdirSync(bp(`./tmp/${version}/patches`));
    } else {
      zip.extractAllTo(btemp(`./${version}`));

      const currentSignature = fs.readFileSync(btemp(`${version}/main.signature`)).toString();
      const previousSignature = fs.readFileSync(bp(`./tmp/${version}/main.signature`)).toString();
      if (currentSignature !== previousSignature) {

        const currentPatches = fs.readdirSync(bp(`./tmp/${version}/patches`));
        const isNew = currentPatches.length <= 0 || currentPatches.filter((patch) => {
          if (fs.lstatSync(bp(`./tmp/${version}/patches/${patch}`)).isDirectory() === false) return false;
          const patchSignature = fs.readFileSync(bp(`./tmp/${version}/patches/${patch}/main.signature`)).toString();
          return patchSignature === currentSignature;
        }).length <= 0;

        if (isNew) {
          const nextIncrementalPatchNumber = currentPatches.length <= 0 ? 1 : currentPatches.length + 1;
          fss.mkdirSync(bp(`./tmp/${version}/patches/${nextIncrementalPatchNumber}`));
          zip.extractAllTo(bp(`./tmp/${version}/patches/${nextIncrementalPatchNumber}`));

          const aUpgrade = [
            bp(`./tmp/${version}/main.jsbundle`),
            bp(`./tmp/${version}/patches/${nextIncrementalPatchNumber}/main.jsbundle`)
          ];
          await generatePatch(...aUpgrade, {
            output: bp(`./tmp/${version}/patches/${nextIncrementalPatchNumber}/main.patch`)
          });

        } else {
          console.log("Processed the same update bundle in version ", version, " and patch ", isNew);
        }

      } else {
        console.log("Processed the same main bundle in version ", version);
      }

    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

exports.generateUpdate = async (updatePath, destinationPath) => {
  try {
    if (fss.existsSync(destinationPath) === false) {
      throw new Error("File does not exist.");
    }

    const zip = new AdmZip();
    const bundle = fss.readFileSync(`${updatePath}/main.jsbundle`);
    const sha1 = crypto.createHash('sha1').update(bundle).digest('hex');

    zip.addFile('main.signature', sha1);
    zip.addLocalFolder(`${updatePath}`);

    return Promise.resolve(zip.toBuffer());
  } catch (err) {
    return Promise.reject(err);
  }
}


exports.generatePatch = generatePatch;

exports.patchFile = async (bundleToPatch, patchFilePath, opt = {}) => {
  const dmp = new DMP();
  const oldBundleVersion = basename(bundleToPatch).replace(".jsbundle", "").replace(".patch", "");
  const newBundleVersion = basename(patchFilePath).replace(".jsbundle", "").replace(".patch", "");

  const bundlePath = findFile(bundleToPatch)
  const bundleContent = await checkFileIsExisted(bundlePath)
  const patchContent = await checkFileIsExisted(findFile(patchFilePath))
  const patchArr = dmp.patch_fromText(patchContent)

  await fs.writeFile(
    opt.replace ? bundlePath : `${oldBundleVersion}-to-${newBundleVersion}.patch.jsbundle`,
    dmp.patch_apply(patchArr, bundleContent),
    'utf8'
  )
}

exports.checkPatchValid = async (patchFilePath) => {
  const dmp = new DMP()
  const patchFullPath = findFile(patchFilePath)
  const patchContent = await fs.readFile(patchFullPath, 'utf8')
  try {
    dmp.patch_fromText(patchContent)
    console.log('Patchfile is valid')
  } catch (e) {
    console.error('Patchfile is not valid for：', e.message)
    process.exit(1)
  }
}

exports.generateHash = function fileHash(filename) {
  return new Promise((resolve, reject) => {
    let shasum = crypto.createHash(`sha1`);
    try {
      let s = fs.ReadStream(filename)
      s.on('data', function (data) {
        shasum.update(data)
      })
      s.on('end', function () {
        const hash = shasum.digest('hex')
        return resolve(hash);
      })
    } catch (error) {
      return reject('calc fail');
    }
  });
}