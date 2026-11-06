import { BadRequestException } from '@nestjs/common';

const YOUTUBE_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
]);
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function normalizarYoutubeUrl(url?: string | null): string | null {
    const valor = url?.trim();
    if (!valor) return null;

    let parsed: URL;
    try {
        parsed = new URL(valor);
    } catch {
        throw new BadRequestException('Informe um link válido do YouTube.');
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || !YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) {
        throw new BadRequestException('Informe um link válido do YouTube.');
    }

    let videoId: string | undefined;
    if (parsed.hostname.toLowerCase() === 'youtu.be') {
        videoId = parsed.pathname.split('/').filter(Boolean)[0];
    } else if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') ?? undefined;
    } else {
        const [, , pathVideoId] = parsed.pathname.split('/');
        if (['embed', 'shorts', 'live'].includes(parsed.pathname.split('/')[1])) {
            videoId = pathVideoId;
        }
    }

    if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
        throw new BadRequestException('Informe um link válido do YouTube.');
    }

    return `https://www.youtube.com/watch?v=${videoId}`;
}
