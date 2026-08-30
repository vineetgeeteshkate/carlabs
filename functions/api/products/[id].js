import { json, err, num } from "../_utils.js";

// PUT /api/products/:id -> update a product
export async function onRequestPut({ params, request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || !b.name) return err("Product name is required");

  const res = await env.DB.prepare(
    `UPDATE products
     SET name=?, type=?, packing=?, hsn=?, tax=?, mrp=?, ptr=?, pts=?, mfr_id=?, bno=?, mfd=?, exp=?, updated_at=datetime('now')
     WHERE id=?`
  )
    .bind(
      b.name,
      b.type || null,
      b.packing || null,
      b.hsn || null,
      num(b.tax, 5),
      num(b.mrp),
      num(b.ptr),
      num(b.pts),
      b.mfrId || null,
      b.bno || null,
      b.mfd || null,
      b.exp || null,
      params.id
    )
    .run();

  if (res.meta.changes === 0) return err("Product not found", 404);
  return json({ ok: true });
}

// DELETE /api/products/:id
export async function onRequestDelete({ params, env }) {
  const res = await env.DB.prepare(`DELETE FROM products WHERE id=?`).bind(params.id).run();
  if (res.meta.changes === 0) return err("Product not found", 404);
  return json({ ok: true });
}
