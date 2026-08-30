import { json, err } from "../_utils.js";

// PUT /api/parties/:id -> update a buyer
export async function onRequestPut({ params, request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || !b.name) return err("Buyer name is required");

  const res = await env.DB.prepare(
    `UPDATE parties
     SET name=?, type=?, abbr=?, address=?, gstin=?, pan=?, dl=?, phone=?, updated_at=datetime('now')
     WHERE id=?`
  )
    .bind(
      b.name,
      b.type || "Distributor",
      b.abbr || null,
      b.addr || null,
      b.gstin || null,
      b.pan || null,
      b.dl || null,
      b.phone || null,
      params.id
    )
    .run();

  if (res.meta.changes === 0) return err("Buyer not found", 404);
  return json({ ok: true });
}

// DELETE /api/parties/:id
export async function onRequestDelete({ params, env }) {
  const res = await env.DB.prepare(`DELETE FROM parties WHERE id=?`).bind(params.id).run();
  if (res.meta.changes === 0) return err("Buyer not found", 404);
  return json({ ok: true });
}
