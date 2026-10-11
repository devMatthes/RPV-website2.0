import { parentPort, workerData } from 'node:worker_threads';
import sharp from 'sharp';
import convert from 'heic-convert';
import { uploadLimits } from '../src/lib/service-types.ts';
import { readFile, writeFile } from 'node:fs/promises';
function assertHeicDimensions(bytes: Buffer) {
  // HEIF image spatial extents ('ispe'): reject oversized images before allocating decoder memory.
  let found=false;
  for(let offset=4;offset<bytes.length-16;offset++) if(bytes.toString('ascii',offset,offset+4)==='ispe') {
    const boxSize=bytes.readUInt32BE(offset-4);if(boxSize<20||offset-4+boxSize>bytes.length)continue;
    const width=bytes.readUInt32BE(offset+8),height=bytes.readUInt32BE(offset+12);if(!width||!height||width*height>uploadLimits.pixels)throw new Error('Zdjęcie ma zbyt dużą rozdzielczość (limit 40 MP).');found=true;
  }
  if(!found)throw new Error('Nie można odczytać wymiarów zdjęcia HEIC.');
}
try {
  let bytes=await readFile(workerData.input);
  if(bytes.length>uploadLimits.inputBytes)throw new Error('Plik przekracza 20 MB.');
  const heic=bytes.length>12&&bytes.toString('ascii',4,8)==='ftyp'&&['heic','heix','hevc','hevx','mif1','msf1'].includes(bytes.toString('ascii',8,12));
  if(heic){assertHeicDimensions(bytes);bytes=Buffer.from(await convert({buffer:bytes,format:'JPEG',quality:.95}));}
  const image=sharp(bytes,{limitInputPixels:uploadLimits.pixels,animated:false,failOn:'warning'});
  const metadata=await image.metadata();
  if(!['jpeg','png','webp'].includes(metadata.format ?? ''))throw new Error('Dodaj zdjęcie JPG, PNG, WebP lub HEIC.');
  const output=await image.rotate().resize({width:uploadLimits.imageEdge,height:uploadLimits.imageEdge,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:85,mozjpeg:true}).toBuffer();
  const thumbnail=await sharp(output).resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).jpeg({quality:75}).toBuffer();
  await writeFile(workerData.output,output,{mode:0o600});await writeFile(workerData.thumbnail,thumbnail,{mode:0o600});
  parentPort?.postMessage({size:output.length,mime:'image/jpeg'});
} catch(error){parentPort?.postMessage({error:error instanceof Error?error.message:'Nie udało się odczytać zdjęcia.'});}
