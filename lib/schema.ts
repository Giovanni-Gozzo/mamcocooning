/** Database schema, applied idempotently by `npm run db:migrate`. */
export const SCHEMA_STATEMENTS: readonly string[] = [
  `create table if not exists categories (
     slug        text primary key,
     label       text not null,
     emoji       text not null default '✨',
     description text not null default '',
     sort_order  integer not null default 500,
     created_at  timestamptz not null default now()
   )`,
  `create table if not exists photos (
     id            text primary key,
     url           text not null,
     width         integer not null,
     height        integer not null,
     alt           text not null default '',
     caption       text,
     category_slug text not null references categories(slug) on update cascade,
     confidence    real,
     source        text not null default 'upload',
     is_published  boolean not null default true,
     created_at    timestamptz not null default now()
   )`,
  `create index if not exists photos_category_idx on photos (category_slug, created_at desc)`,
  `create index if not exists photos_published_idx on photos (is_published, created_at desc)`,
  // Ledger of every Facebook image ever imported. It outlives the photo row, so
  // a picture Sigrid takes off the site is never pulled back in by the next sync.
  // photo_id stays null while an import is in progress or after it failed;
  // attempts caps retries so a broken picture is not re-processed forever.
  `create table if not exists facebook_imports (
     external_id text primary key,
     photo_id    text,
     attempts    integer not null default 1,
     imported_at timestamptz not null default now()
   )`,
]
