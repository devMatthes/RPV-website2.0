import { imageDimensions } from '../src/lib/image-dimensions.ts';
import { parentPort, workerData } from 'node:worker_threads';
import sharp from 'sharp';
import convert from 'heic-convert';
import { uploadLimits } from '../src/lib/service-types.ts';
import { readFile, writeFile } from 'node:fs/promises';

try {
  let bytes=await readFile(workerData.input);
  if(bytes.length>uploadLimits.inputBytes)throw new Error('Plik przekracza 20 MB.');
  const heic=bytes.length>12&&bytes.toString('ascii',4,8)==='ftyp'&&['heic','heix','hevc','hevx','mif1','msf1'].includes(bytes.toString('ascii',8,12));
  if(heic){const dimensions=imageDimensions(bytes);if(!dimensions||!dimensions.width||!dimensions.height||dimensions.width*dimensions.height>uploadLimits.pixels)throw new Error('Zdjęcie ma niepoprawne wymiary lub przekracza 40 MP.');bytes=Buffer.from(await convert({buffer:bytes,format:'JPEG',quality:.95}));}
  const image=sharp(bytes,{limitInputPixels:uploadLimits.pixels,animated:false,failOn:'warning'});
  const metadata=await image.metadata();
  if(!['jpeg','png','webp'].includes(metadata.format ?? ''))throw new Error('Dodaj zdjęcie JPG, PNG, WebP lub HEIC.');
  const output=await image.rotate().resize({width:uploadLimits.imageEdge,height:uploadLimits.imageEdge,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:85,mozjpeg:true}).toBuffer();
  const thumbnail=await sharp(output).resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).jpeg({quality:75}).toBuffer();
  await writeFile(workerData.output,output,{mode:0o600});await writeFile(workerData.thumbnail,thumbnail,{mode:0o600});
  parentPort?.postMessage({size:output.length,mime:'image/jpeg'});
} catch(error){parentPort?.postMessage({error:error instanceof Error?error.message:'Nie udało się odczytać zdjęcia.'});}
