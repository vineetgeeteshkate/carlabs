// Shared helpers used by every API endpoint.
// No auth yet (added later) — every request currently acts as full-access.

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function err(message, status = 400) {
  return json({ error: message }, status);
}

export function newId() {
  return crypto.randomUUID();
}

export function num(v, d = 0) {
  if (v === undefined || v === null || v === "") return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

// ---------- products: DB row (snake_case) <-> app object (camelCase) ----------
export function productFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    packing: r.packing,
    hsn: r.hsn,
    tax: r.tax,
    mrp: r.mrp,
    ptr: r.ptr,
    pts: r.pts,
    mfrId: r.mfr_id,
    bno: r.bno,
    mfd: r.mfd,
    exp: r.exp,
    stock: r.start_stock, // caller may overwrite with computed live stock
  };
}

// ---------- parties ----------
export function partyFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    abbr: r.abbr,
    addr: r.address,
    gstin: r.gstin,
    pan: r.pan,
    dl: r.dl,
    phone: r.phone,
  };
}

// ---------- manufacturers ----------
export function mfrFromRow(r) {
  return { id: r.id, name: r.name, gstin: r.gstin, addr: r.address };
}

// ---------- invoices ----------
export function invoiceFromRow(r, items) {
  return {
    id: r.id,
    invoiceNo: r.invoice_no,
    date: r.date,
    partyId: r.party_id,
    cd: r.cd_percent,
    party: {
      name: r.party_name,
      type: r.party_type,
      addr: r.party_addr,
      gstin: r.party_gstin,
      pan: r.party_pan,
      dl: r.party_dl,
      phone: r.party_phone,
    },
    totals: {
      gross: r.gross,
      cd: r.cd_amount,
      sub: r.sub_total,
      cgst: r.cgst,
      sgst: r.sgst,
      net: r.net_total,
    },
    lines: (items || []).map((l) => ({
      productId: l.product_id,
      name: l.name,
      packing: l.packing,
      bno: l.bno,
      mfg: l.mfg,
      exp: l.exp,
      hsn: l.hsn,
      qty: l.qty,
      free: l.free,
      ptr: l.ptr,
      pts: l.pts,
      mrp: l.mrp,
      tax: l.tax,
      total: l.total,
    })),
  };
}
