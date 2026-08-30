import { json, err, newId, mfrFromRow } from "./_utils.js";

// GET /api/manufacturers -> list all
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM manufacturers ORDER BY name COLLATE NOCASE`
  ).all();
  return json({ manufacturers: results.map(mfrFromRow) });
}

// POST /api/manufacturers -> create a new one
export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || !b.name) return err("Manufacturer name is required");

  const id = b.id || newId();
  await env.DB.prepare(
    `INSERT INTO manufacturers (id, name, gstin, address) VALUES (?, ?, ?, ?)`
  )
    .bind(id, b.name, b.gstin || null, b.addr || null)
    .run();

  return json({ id }, 201);
}
