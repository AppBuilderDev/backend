import { expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { allocateProjectSlug, initializeProjectSlugs } from '../src/legacy/platform/projectSlugs';

it('migrates existing projects with unique stable slugs and preserves IDs', () => {
  const db = new Database(':memory:');
  try {
    db.exec(
      "CREATE TABLE organizations(id TEXT PRIMARY KEY, name TEXT); CREATE TABLE projects(id TEXT PRIMARY KEY, organization_id TEXT); INSERT INTO organizations VALUES ('a','Test001'),('b','Test001'); INSERT INTO projects VALUES ('first','a'),('second','b');",
    );
    initializeProjectSlugs(db);
    const rows = db.prepare('SELECT id,slug FROM projects ORDER BY rowid').all();
    expect(rows).toEqual([
      { id: 'first', slug: 'test001' },
      { id: 'second', slug: 'test001-2' },
    ]);
    db.prepare("UPDATE organizations SET name='Nuevo nombre' WHERE id='a'").run();
    initializeProjectSlugs(db);
    expect(db.prepare('SELECT id,slug FROM projects ORDER BY rowid').all()).toEqual(rows);
  } finally {
    db.close();
  }
});

it('normalizes accents and protects reserved route prefixes', () => {
  const db = new Database(':memory:');
  try {
    db.exec('CREATE TABLE projects(slug TEXT UNIQUE)');
    expect(allocateProjectSlug(db, 'Mi aplicaci\u00f3n')).toBe('mi-aplicacion');
    expect(allocateProjectSlug(db, 'API')).toBe('app-api');
    expect(allocateProjectSlug(db, '!!!')).toBe('aplicacion');
  } finally {
    db.close();
  }
});
