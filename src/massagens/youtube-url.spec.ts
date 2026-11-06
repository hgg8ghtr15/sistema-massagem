import { BadRequestException } from '@nestjs/common';
import { normalizarYoutubeUrl } from './youtube-url';

describe('normalizarYoutubeUrl', () => {
    it.each([
        ['https://www.youtube.com/watch?v=aqz-KE-bpKQ', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'],
        ['https://youtu.be/aqz-KE-bpKQ?t=10', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'],
        ['https://youtube.com/shorts/aqz-KE-bpKQ', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'],
        ['https://www.youtube.com/embed/aqz-KE-bpKQ', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'],
    ])('normalizes %s', (url, expected) => {
        expect(normalizarYoutubeUrl(url)).toBe(expected);
    });

    it.each(['https://example.com/watch?v=aqz-KE-bpKQ', 'https://youtu.be/not-a-video-id'])(
        'rejects invalid URL %s',
        (url) => {
            expect(() => normalizarYoutubeUrl(url)).toThrow(BadRequestException);
        },
    );

    it('returns null when the video is cleared', () => {
        expect(normalizarYoutubeUrl(null)).toBeNull();
        expect(normalizarYoutubeUrl('  ')).toBeNull();
    });
});
