import { json, err, newId, num } from "../../_utils.js";

// POST /api/products/:id/stock  { stock: <new total quantity on hand> }
// The Purchase Details screen lets the owner type an absolute "in stock" number.
// To keep the movement log a true audit trail, we record the DIFFERENCE between
// the new number and the current live stock as a 'manual' stock_moves entry,
// instead of overwriting anything.
export async function onRequestPost({ params, request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || b.stock === undefined) return err("stock value is required");

  const prod = await env.DB.prepare(`SELECT * FROM products WHERE id=?`).bind(params.id).first();
  if (!prod) return err("Product not found", 404);

  const moveSum = await env.DB.prepare(
    `SELECT COALESCE(SUM(change),0) AS total FROM stock_moves WHERE product_id=?`
  ).bind(params.id).first();
  const currentLive = num(prod.start_stock) + num(moveSum.total);
  const target = num(b.stock);
  const delta = target - currentLive;

  if (delta !== 0) {
    await env.DB.prepare(
      `INSERT INTO stock_moves (id, product_id, change, reason, note) VALUES (?, ?, ?, 'manual', ?)`
    ).bind(newId(), params.id, delta, b.note || "Manual stock update (Purchase details)").run();
  }

  return json({ ok: true, stock: target });
}
