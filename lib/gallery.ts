/**
 * Shared gallery constants. Kept out of the client component so Server
 * Components can import the value itself rather than a client reference.
 */

/** New photos arrive most days, so the grid is paged rather than loaded whole. */
export const GALLERY_PAGE_SIZE = 48
