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
]
