// Read container dimensions before decoding; avoids allocating huge bitmaps on mobile.
export function imageDimensions(bytes:Uint8Array):{width:number;height:number}|undefined {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const ascii=(offset:number,length:number)=>String.fromCharCode(...bytes.subarray(offset,offset+length));
  if(bytes.length>=24&&bytes[0]===137&&ascii(1,3)==='PNG'&&ascii(12,4)==='IHDR')return {width:view.getUint32(16),height:view.getUint32(20)};
  if(bytes.length>=4&&bytes[0]===255&&bytes[1]===216){let offset=2;while(offset+8<bytes.length){if(bytes[offset]!==255)return;while(bytes[offset]===255)offset++;const marker=bytes[offset++];if(offset+2>bytes.length)return;if(marker===217||marker===218)return;if(marker===1||marker>=208&&marker<=215)continue;const size=view.getUint16(offset);if(size<2||offset+size>bytes.length)return;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return {width:view.getUint16(offset+5),height:view.getUint16(offset+3)};offset+=size;}}
  if(bytes.length>=30&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'){
    const kind=ascii(12,4);if(kind==='VP8X')return {width:1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16),height:1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)};
    if(kind==='VP8 '&&ascii(23,3)==='\x9d\x01\x2a')return {width:view.getUint16(26,true)&16383,height:view.getUint16(28,true)&16383};
    if(kind==='VP8L'&&bytes[20]===47){const bits=view.getUint32(21,true);return {width:(bits&16383)+1,height:((bits>>>14)&16383)+1};}
  }
  if(bytes.length>16&&ascii(4,4)==='ftyp'){let result:{width:number;height:number}|undefined;for(let offset=4;offset+16<=bytes.length;offset++)if(bytes[offset]===105&&bytes[offset+1]===115&&bytes[offset+2]===112&&bytes[offset+3]===101){const size=view.getUint32(offset-4);if(size<20||offset-4+size>bytes.length)continue;const width=view.getUint32(offset+8),height=view.getUint32(offset+12);if(!result||width*height>result.width*result.height)result={width,height};}return result;}
}
