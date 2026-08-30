import { json, err, newId, num, invoiceFromRow } from "../_utils.js";

// GET /api/invoices/:id -> one bill with its line items
export async function onRequestGet({ params, env }) {
  const inv = await env.DB.prepare(`SELECT * FROM invoices WHERE id=?`).bind(params.id).first();
  if (!inv) return err("Invoice not found", 404);
  const { results: items } = await env.DB.prepare(
    `SELECT * FROM invoice_items WHERE invoice_id=?`
  ).bind(params.id).all();
  return json({ invoice: invoiceFromRow(inv, items) });
}

// PUT /api/invoices/:id -> edit a bill's header fields (Owner only — enforced later with login).
// Note: this does NOT touch stock_moves or line items; editing line items is treated
// as delete + recreate from the app side to keep stock movements correct and simple.
export async function onRequestPut({ params, request, env }) {
  const b = await request.json().catch(() => null);
  if (!b) return err("Invalid body");
  const p = b.party || {};
  const t = b.totals || {};

  const res = await env.DB.prepare(
    `UPDATE invoices SET
       invoice_no=?, date=?, party_id=?, party_name=?, party_type=?, party_addr=?, party_gstin=?,
       party_pan=?, party_dl=?, party_phone=?, cd_percent=?, gross=?, cd_amount=?, sub_total=?,
       cgst=?, sgst=?, net_total=?
     WHERE id=?`
  )
    .bind(
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
      params.id
    )
    .run();

  if (res.meta.changes === 0) return err("Invoice not found", 404);
  return json({ ok: true });
}

// DELETE /api/invoices/:id -> remove a bill, reverse its stock deduction, and drop its line items.
// (Owner only — enforced later with login.)
export async function onRequestDelete({ params, env }) {
  const inv = await env.DB.prepare(`SELECT id FROM invoices WHERE id=?`).bind(params.id).first();
  if (!inv) return err("Invoice not found", 404);

  const { results: moves } = await env.DB.prepare(
    `SELECT * FROM stock_moves WHERE invoice_id=? AND reason='sale'`
  ).bind(params.id).all();

  const stmts = moves.map((m) =>
    env.DB.prepare(
      `INSERT INTO stock_moves (id, product_id, change, reason, invoice_id, note)
       VALUES (?, ?, ?, 'reversal', ?, 'Invoice deleted')`
    ).bind(newId(), m.product_id, -m.change, params.id)
  );

  stmts.push(env.DB.prepare(`DELETE FROM invoice_items WHERE invoice_id=?`).bind(params.id));
  stmts.push(env.DB.prepare(`DELETE FROM invoices WHERE id=?`).bind(params.id));

  await env.DB.batch(stmts);
  return json({ ok: true });
}
