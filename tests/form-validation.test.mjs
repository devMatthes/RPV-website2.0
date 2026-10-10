import test from 'node:test';
import assert from 'node:assert/strict';
import { validPhone, validateAttachments, attachmentLimits } from '../src/lib/form-validation.ts';
const file = (changes = {}) => ({ name: 'panel.jpg', type: 'image/jpeg', size: 1024, ...changes });
test('phone accepts common formatting, rejects text and invalid digit counts', () => {
  for (const phone of ['+48 515 114 676', '515-114-676', '(48) 515 114 676']) assert.equal(validPhone(phone), true);
  for (const phone of ['', '       ', '123456', '1234567890123456', '515 abc 676', '++48 515114676']) assert.equal(validPhone(phone), false);
});
test('attachments validate both extension and MIME, including HEIC with unknown MIME', () => {
  assert.equal(validateAttachments([file(), file({name:'serial.HEIC',type:''})]), '');
  assert.notEqual(validateAttachments([file({name:'payload.exe'})]), '');
  assert.notEqual(validateAttachments([file({type:'text/html'})]), '');
  assert.notEqual(validateAttachments([file({size:0})]), '');
});
test('attachment limits reject excess count, individual size and total size', () => {
  assert.equal(validateAttachments(Array.from({length:5},()=>file())), '');
  assert.notEqual(validateAttachments(Array.from({length:6},()=>file())), '');
  assert.equal(validateAttachments([file({size:attachmentLimits.perFile})]), '');
  assert.notEqual(validateAttachments([file({size:attachmentLimits.perFile+1})]), '');
  assert.notEqual(validateAttachments(Array.from({length:3},()=>file({size:8*1024*1024}))), '');
});
