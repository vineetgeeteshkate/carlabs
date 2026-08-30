import { json, err } from "../_utils.js";

// PUT /api/manufacturers/:id
export async function onRequestPut({ params, request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || !b.name) return err("Manufacturer name is required");

  const res = await env.DB.prepare(
    `UPDATE manufacturers SET name=?, gstin=?, address=?, updated_at=datetime('now') WHERE id=?`
  )
    .bind(b.name, b.gstin || null, b.addr || null, params.id)
    .run();

  if (res.meta.changes === 0) return err("Manufacturer not found", 404);
  return json({ ok: true });
}

// DELETE /api/manufacturers/:id
export async function onRequestDelete({ params, env }) {
  const res = await env.DB.prepare(`DELETE FROM manufacturers WHERE id=?`).bind(params.id).run();
  if (res.meta.changes === 0) return err("Manufacturer not found", 404);
  return json({ ok: true });
}
