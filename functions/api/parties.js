import { json, err, newId, partyFromRow } from "./_utils.js";

// GET /api/parties -> list all buyers
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM parties ORDER BY name COLLATE NOCASE`
  ).all();
  return json({ parties: results.map(partyFromRow) });
}

// POST /api/parties -> create a new buyer
export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || !b.name) return err("Buyer name is required");

  const id = b.id || newId();
  await env.DB.prepare(
    `INSERT INTO parties (id, name, type, abbr, address, gstin, pan, dl, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      b.name,
      b.type || "Distributor",
      b.abbr || null,
      b.addr || null,
      b.gstin || null,
      b.pan || null,
      b.dl || null,
      b.phone || null
    )
    .run();

  return json({ id }, 201);
}
