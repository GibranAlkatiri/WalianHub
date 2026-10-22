import { expect, test } from 'bun:test';
import { sumberVideoProfil } from '../src/lib/video-profil.ts';

test('tautan video hanya mengizinkan YouTube dan MP4 publik Cloudinary tanpa kredensial', () => {
  for (const url of [
    'javascript:alert(1)', '//res.cloudinary.com/demo/video/upload/test.mp4',
    'https://res.cloudinary.com.evil.example/demo/video/upload/test.mp4',
    'https://res.cloudinary.com@evil.example/demo/video/upload/test.mp4',
    'https://user:secret@res.cloudinary.com/demo/video/upload/test.mp4',
    'https://res.cloudinary.com/demo/image/upload/test.mp4',
    'https://res.cloudinary.com/demo/video/authenticated/test.mp4',
    'http://res.cloudinary.com/demo/video/upload/test.mp4',
    'https://res.cloudinary.com/demo/video/upload/test.mp4?token=private',
    'https://drive.google.com/file/d/test/view',
    'https://www.youtube.com.evil.example/watch?v=abcdefghijk',
    'https://user:secret@www.youtube.com/watch?v=abcdefghijk',
    'https://www.youtube.com:8443/watch?v=abcdefghijk',
  ]) expect(sumberVideoProfil(url)).toBeNull();
  expect(sumberVideoProfil('https://youtu.be/abcdefghijk?si=tracking')).toEqual({
    jenis: 'youtube', url: 'https://www.youtube.com/embed/abcdefghijk?playsinline=1&rel=0',
    tautan: 'https://www.youtube.com/watch?v=abcdefghijk',
  });
  const url = 'https://res.cloudinary.com/demo/video/upload/c_limit,w_1280,q_auto,vc_h264/video.mp4';
  expect(sumberVideoProfil(url)).toEqual({ jenis: 'mp4', url, tautan: url });
  const path='/videos/12345678-1234-4234-8234-123456789012.mp4';
  expect(sumberVideoProfil(path)).toEqual({jenis:'mp4',url:path,tautan:path});
  for(const invalid of [path+'?token=test',path+'/extra','//evil.example'+path,'/videos/../test.mp4'])expect(sumberVideoProfil(invalid)).toBeNull();
});
