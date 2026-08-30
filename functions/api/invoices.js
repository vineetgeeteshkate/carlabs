import { json, err, newId, num, invoiceFromRow } from "./_utils.js";

// GET /api/invoices -> list all bills (header only, no line items — keeps the list light)
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM invoices ORDER BY date DESC, created_at DESC`
  ).all();
  const invoices = results.map((r) => invoiceFromRow(r, []));
  return json({ invoices });
}

// POST /api/invoices -> create a bill + its line items + stock_moves, all together.
// Body shape matches the app's existing "rec" object from doSave():
// { invoiceNo, date, partyId, cd, party:{...}, lines:[...], totals:{...} }
export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || !b.invoiceNo || !b.date) return err("invoiceNo and date are required");
  if (!Array.isArray(b.lines) || b.lines.length === 0) return err("At least one line item is required");

  const invId = b.id || newId();
  const p = b.party || {};
  const t = b.totals || {};

  const stmts = [];

  stmts.push(
    env.DB.prepare(
      `INSERT INTO invoices
       (id, invoice_no, date, party_id, party_name, party_type, party_addr, party_gstin, party_pan, party_dl, party_phone,
        cd_percent, gross, cd_amount, sub_total, cgst, sgst, net_total, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      invId,
      b.invoiceNo,
      b.date,
      b.partyId || null,
      p.name || null,
      p.type || null,
      p.addr || null,
      p.gstin || null,
      p.pan || null,
      p.dl || null,
      p.phone || null,
      num(b.cd),
      num(t.gross),
      num(t.cd),
      num(t.sub),
      num(t.cgst),
      num(t.sgst),
      num(t.net),
      b.createdBy || null
    )
  );

  for (const l of b.lines) {
    const itemId = newId();
    stmts.push(
      env.DB.prepare(
        `INSERT INTO invoice_items
         (id, invoice_id, product_id, name, packing, bno, mfg, exp, hsn, qty, free, ptr, pts, mrp, tax, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        itemId,
        invId,
        l.productId || null,
        l.name || null,
        l.packing || null,
        l.bno || null,
        l.mfg || null,
        l.exp || null,
        l.hsn || null,
        num(l.qty),
        num(l.free),
        num(l.ptr),
        num(l.pts),
        num(l.mrp),
        num(l.tax, 5),
        num(l.total)
      )
    );

    // Deduct stock: qty + free, logged as a movement (only when the line has a known product)
    if (l.productId) {
      const used = num(l.qty) + num(l.free);
      if (used > 0) {
        stmts.push(
          env.DB.prepare(
            `INSERT INTO stock_moves (id, product_id, change, reason, invoice_id, created_by)
             VALUES (?, ?, ?, 'sale', ?, ?)`
          ).bind(newId(), l.productId, -used, invId, b.createdBy || null)
        );
      }
    }
  }

  // Run everything as one atomic batch — either the whole bill + stock updates land, or none do.
  await env.DB.batch(stmts);

  return json({ id: invId }, 201);
}
