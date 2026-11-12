/** Limits shared by the admin page (browser) and the server. No server code here. */
export const MAX_POST_TEXT_LENGTH = 5000
export const MAX_MEDIA_PER_POST = 20
export const MAX_VIDEO_BYTES = 400 * 1024 * 1024
export const MAX_VIDEO_SECONDS = 180
/** Where the browser drops files before the server processes them. */
export const INCOMING_PREFIX = 'incoming/'

const VIDEO_EXTENSIONS = /\.(mov|mp4|m4v|webm|3gp)$/i

export function isVideoFile(file: Pick<File, 'type' | 'name'>): boolean {
  return file.type.startsWith('video/') || VIDEO_EXTENSIONS.test(file.name)
}
