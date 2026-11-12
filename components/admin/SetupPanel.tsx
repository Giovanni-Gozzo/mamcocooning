const HINTS: Record<string, string> = {
  ADMIN_PASSWORD_HASH: 'Généré par « npm run hash:password "votre mot de passe" ».',
  SESSION_SECRET: 'Généré par la même commande, sur la deuxième ligne.',
  DATABASE_URL: 'Vercel > Storage > Create Database > Neon. Ajoutée automatiquement.',
  BLOB_READ_WRITE_TOKEN: 'Vercel > Storage > Create Database > Blob. Ajoutée automatiquement.',
}

interface SetupPanelProps {
  readonly missing: readonly string[]
}

/** Tells what is still missing in Vercel. The database keeps itself up to date. */
export function SetupPanel({ missing }: SetupPanelProps) {
  return (
    <section className="rounded-[2.5rem] bg-sand/70 p-8 ring-1 ring-clay/45">
      <h2 className="text-2xl">Configuration</h2>

      {missing.length === 0 ? (
        <p className="mt-2 leading-relaxed text-sage-deep">
          Tout est configuré : stockage et base de données. La base se met à jour toute seule.
        </p>
      ) : (
        <>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Variables encore manquantes dans Vercel (Settings &rsaquo; Environment Variables) :
          </p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {missing.map((name) => (
              <li key={name} className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-clay/50">
                <code className="font-mono text-sm font-bold text-terracotta-deep">{name}</code>
                <p className="mt-1 text-sm text-ink-soft">{HINTS[name] ?? ''}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
