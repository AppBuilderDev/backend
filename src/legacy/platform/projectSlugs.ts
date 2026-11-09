import type Database from 'better-sqlite3';

const reserved = new Set(['api', 'p', 'admin', 'assets', 'editor', 'preview', 'workspace']);
export function allocateProjectSlug(db: Database.Database, name: string): string {
  let base =
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || 'aplicacion';
  if (reserved.has(base)) base = 'app-' + base;
  let slug = base;
  for (let suffix = 2; db.prepare('SELECT 1 FROM projects WHERE slug=?').get(slug); suffix++)
    slug = base + '-' + suffix;
  return slug;
}
export function initializeProjectSlugs(db: Database.Database) {
  db.transaction(() => {
    const columns = db.pragma('table_info(projects)') as { name: string }[];
    if (!columns.some((column) => column.name === 'slug'))
      db.exec('ALTER TABLE projects ADD COLUMN slug TEXT');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS projects_slug ON projects(slug)');
    const rows = db
      .prepare(
        'SELECT p.id,o.name FROM projects p JOIN organizations o ON o.id=p.organization_id WHERE p.slug IS NULL ORDER BY p.rowid',
      )
      .all() as { id: string; name: string }[];
    for (const row of rows)
      db.prepare('UPDATE projects SET slug=? WHERE id=?').run(
        allocateProjectSlug(db, row.name),
        row.id,
      );
  }).immediate();
}
