const fs = require('fs');
const { join } = require('path');
const ROOT = process.cwd();
const UPDATES_PATH = join(ROOT, '/tmp/RNBanana/Updates');
const STORAGE_PATH = join(ROOT, '/tmp/RNBanana/Storage');
const TEMPORARY_PATH = join(ROOT, '/tmp/RNBanana/tmp');

const RNBanana = require(join(ROOT, 'lib/RNBanana.js'));

const [, , ...args] = process.argv;
const [command, ...params] = args;

const banana = new RNBanana({
  storagePath: STORAGE_PATH,
  tmpPath: TEMPORARY_PATH,
  updatesPath: UPDATES_PATH,
  version: '1.0.1',
});

(async () => {
  try {

    console.log("Called command ", command, params)
    switch (command) {
      case 'createUpdate':
        const [upgradeFolderPath, patchDestinationPath] = params;
        const zip = await banana.generateUpdate(join(ROOT, upgradeFolderPath), UPDATES_PATH);
        fs.writeFileSync(join(ROOT, patchDestinationPath), zip);
        break;
      case 'loadUpdate':
        const [zipFolderPath] = params;
        banana.load(zipFolderPath);
        break;
      case 'pack':
        const [signature, upgradeDestinationPath] = params;
        banana.pack(signature, join(ROOT, upgradeDestinationPath));
        break;
      case 'help':
      default:
        console.log(`
    --- RNBanana HELP ---
    1. Based on a reactnative project, build an update zip with the bundle and assets

    npm run createUpdate ./versions/1.0.1/0 ./tmp/RNBanana/Updates/v1.0.1_0.zip
    npm run createUpdate ./versions/1.0.1/1 ./tmp/RNBanana/Updates/v1.0.1_1.zip
    npm run createUpdate ./versions/1.0.1/2 ./tmp/RNBanana/Updates/v1.0.1_2.zip

    2. Now We similate backend handling new zips from updates
    npm run loadUpdate ./tmp/RNBanana/Updates/v1.0.1_0.zip
    npm run loadUpdate ./tmp/RNBanana/Updates/v1.0.1_1.zip
    npm run loadUpdate ./tmp/RNBanana/Updates/v1.0.1_2.zip

    3. Pack to generate a zip with the patches and assets to upgrade from a to b
    npm run pack acfb9b34fea79bd66864471bb45d100a73dd0e56 ./v1.0.1_acfb9b34fea79bd66864471bb45d100a73dd0e56.zip
    npm run pack 9287c7528375ddcc7ce1b85e54356e72427eb232 ./v1.0.1_9287c7528375ddcc7ce1b85e54356e72427eb232.zip
    npm run pack c4d3546be7d33e4900170b24a556eed45ebf83aa ./v1.0.1_c4d3546be7d33e4900170b24a556eed45ebf83aa.zip
    `)
    }

  } catch (err) {
    console.log("debug", err);
    process.exit(0);
  }

})();




//     // const zip1 = await banana.generateUpdate(
//     //   join(ROOT, "./versions/1.0.1/1"),
//     //   UPDATES_PATH
//     // );

//     // const zip2 = await banana.generateUpdate(
//     //   join(ROOT, "./versions/1.0.1/2"),
//     //   UPDATES_PATH
//     // );

//     // fs.writeFileSync(join(ROOT, "./tmp/RNBanana/Updates/v1.0.1_0.zip"), zip0);
//     // fs.writeFileSync(join(ROOT, "./tmp/RNBanana/Updates/v1.0.1_1.zip"), zip1);
//     // fs.writeFileSync(join(ROOT, "./tmp/RNBanana/Updates/v1.0.1_2.zip"), zip2);

//     // banana.load("./tmp/RNBanana/Updates/v1.0.1_0.zip");
//     // banana.load("./tmp/RNBanana/Updates/v1.0.1_1.zip");
//     // banana.load("./tmp/RNBanana/Updates/v1.0.1_2.zip");

//     //request an update
//     let signature = null;
//     signature = 'acfb9b34fea79bd66864471bb45d100a73dd0e56';
//     //signature = '9287c7528375ddcc7ce1b85e54356e72427eb232';
//     //signature = 'c6a1d97147e7db31b0288668e79f907a0fb3aefb';

//     //Le pasamos la version en la que estamos
//    

//     debugger;



