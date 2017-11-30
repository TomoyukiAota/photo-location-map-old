const fs = require('fs');
const exifParser = require('exif-parser');

const imageUtility = require('./image-utility');

const exifPromises = [];
const pathExifPairs = [];

exports.update = async function(directoryTreeRoot) {
  reset();
  addExifPromiseRecursively([directoryTreeRoot]);
  await Promise.all(exifPromises);
  console.log(pathExifPairs);
}

exports.exifFetchError = "Error occured when fetching EXIF."

function reset() {
  exifPromises.length = 0;
  pathExifPairs.length = 0;
}

function addExifPromiseRecursively(directoryTreeElementArray) {
  directoryTreeElementArray.forEach(
    (directoryTreeElement) => {
      addExifPromise(directoryTreeElement);
      if(directoryTreeElement.hasOwnProperty("children")) {
        addExifPromiseRecursively(directoryTreeElement.children);
      }
    }
  )
}

function addExifPromise(directoryTreeElement) {
  if(!imageUtility.isSupportedFilenameExtension(directoryTreeElement.extension))
    return;

  const promise = 
    instantiatePromiseToFetchExif(directoryTreeElement)
    .then(exif => 
      pathExifPairs.push({
        path: directoryTreeElement.path,
        exif: exif
      })
    )
    .catch(() => 
      pathExifPairs.push({
        path: directoryTreeElement.path,
        exif: exports.exifFetchError
      })
    )

  exifPromises.push(promise);
}

function instantiatePromiseToFetchExif(directoryTreeElement) {
  return new Promise(function(resolve, reject) {
    let exif;
    const bufferLengthRequiredToParseExif = 65635;
    const readStream = fs.createReadStream(directoryTreeElement.path, {start: 0, end: bufferLengthRequiredToParseExif - 1});  
    readStream.on('readable', () => {
      let buffer;
      while (null !== (buffer = readStream.read(bufferLengthRequiredToParseExif))) {
        console.log(`Fetched ${buffer.length} bytes of data from ${directoryTreeElement.name}`);
        exif = exifParser.create(buffer).parse();
        console.log(exif);
      }
    });
    readStream.on('end', () => {
      console.log(`Finished fetching data for ${directoryTreeElement.name}.`);
      resolve(exif);
    });
    readStream.on('error', () => {
      console.log(`Error occured when fetching data from ${directoryTreeElement.name}.`);
      reject();
    });
  });
}