import { json, err, newId, num, productFromRow } from "./_utils.js";

// GET /api/products -> list all products, with LIVE stock (opening + moves)
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT p.*,
            p.start_stock + COALESCE((SELECT SUM(m.change) FROM stock_moves m WHERE m.product_id = p.id), 0) AS live_stock
     FROM products p
     ORDER BY p.name COLLATE NOCASE`
  ).all();
  const products = results.map((r) => {
    const p = productFromRow(r);
    p.stock = r.live_stock;
    return p;
  });
  return json({ products });
}

// POST /api/products -> create a new product
export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || !b.name) return err("Product name is required");

  const id = b.id || newId();
  await env.DB.prepare(
    `INSERT INTO products (id, name, type, packing, hsn, tax, mrp, ptr, pts, mfr_id, bno, mfd, exp, start_stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
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
      num(b.stock)
    )
    .run();

  return json({ id }, 201);
}
