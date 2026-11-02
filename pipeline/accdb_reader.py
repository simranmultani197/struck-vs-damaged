"""
Minimal, dependency-free reader for the FAA Wildlife Strike Access export (Public.accdb).

Why this exists: the FAA ships the database only as Microsoft Access (.accdb). The usual tools
(mdbtools `mdb-export`, Jackcess/UCanAccess) need an install. This module reads the Jet4/ACE
page format directly so `python pipeline/accdb_reader.py Public.accdb out.csv` works anywhere
Python 3 runs. If you have mdbtools, `mdb-export Public.accdb STRIKE_REPORTS > strikes.csv`
gives an equivalent CSV.

Format notes (Jet4 / ACE12, 4096-byte pages) follow the mdbtools HACKING.md documentation:
  - page type 0x02 = table definition (TDEF), 0x01 = data page
  - each data page records the TDEF page that owns it, so we read a table by scanning every
    data page whose owner is that table's TDEF (no usage-map decoding needed)
  - row layout: [n_cols:2][fixed cols][var cols][var offsets, reversed][n_var:2][null mask]
  - text is UTF-16LE, optionally "compressed" (0xFF 0xFE prefix, 0x00 toggles mode)

Scope: enough to read the strike table (text, memo, numeric, boolean, date columns).
"""
import csv
import struct
import sys
from datetime import datetime, timedelta

PAGE = 4096
_EPOCH = datetime(1899, 12, 30)

T_BOOL, T_BYTE, T_INT, T_LONG, T_MONEY, T_FLOAT, T_DOUBLE, T_DATE = 1, 2, 3, 4, 5, 6, 7, 8
T_BINARY, T_TEXT, T_OLE, T_MEMO, T_GUID, T_NUMERIC = 9, 10, 11, 12, 15, 16


def _decode_text(b: bytes) -> str:
    if len(b) >= 2 and b[0] == 0xFF and b[1] == 0xFE:
        out, compressed, i = [], True, 2
        while i < len(b):
            if b[i] == 0x00:
                compressed = not compressed
                i += 1
                continue
            if compressed:
                out.append(chr(b[i]))
                i += 1
            else:
                if i + 1 >= len(b):
                    break
                out.append(b[i:i + 2].decode("utf-16-le", errors="replace"))
                i += 2
        return "".join(out)
    return b.decode("utf-16-le", errors="replace")


class Column:
    __slots__ = ("name", "type", "num", "var_idx", "fixed_off", "length", "fixed")

    def __repr__(self):
        return f"Column({self.name!r}, type={self.type}, num={self.num})"


class AccessDB:
    def __init__(self, path):
        self.f = open(path, "rb")
        self.f.seek(0, 2)
        self.n_pages = self.f.tell() // PAGE
        hdr = self.page(0)
        if hdr[4:19] != b"Standard ACE DB" and hdr[4:19] != b"Standard Jet DB":
            raise ValueError("not an Access database")
        if hdr[0x14] == 0:
            raise ValueError("Jet3 (Access 97) format is not supported by this reader")

    def page(self, n):
        self.f.seek(n * PAGE)
        return self.f.read(PAGE)

    # ---------- table definitions ----------
    def _tdef_bytes(self, pg):
        buf = self.page(pg)
        data = bytearray(buf)
        nxt = struct.unpack_from("<I", buf, 4)[0]
        while nxt:
            p = self.page(nxt)
            data += p[8:]
            nxt = struct.unpack_from("<I", p, 4)[0]
        return bytes(data)

    def read_tdef(self, pg):
        d = self._tdef_bytes(pg)
        num_cols = struct.unpack_from("<H", d, 0x2D)[0]
        num_real_idx = struct.unpack_from("<I", d, 0x33)[0]
        pos = 0x3F + num_real_idx * 12
        cols = []
        for _ in range(num_cols):
            c = Column()
            c.type = d[pos]
            c.num = struct.unpack_from("<H", d, pos + 5)[0]
            c.var_idx = struct.unpack_from("<H", d, pos + 7)[0]
            flags = d[pos + 15]
            c.fixed = bool(flags & 0x01)
            c.fixed_off = struct.unpack_from("<H", d, pos + 21)[0]
            c.length = struct.unpack_from("<H", d, pos + 23)[0]
            cols.append(c)
            pos += 25
        for c in cols:
            ln = struct.unpack_from("<H", d, pos)[0]
            c.name = d[pos + 2:pos + 2 + ln].decode("utf-16-le")
            pos += 2 + ln
        return cols

    def find_tables(self):
        """Yield (tdef_page, columns) for every user table definition page."""
        for pg in range(1, self.n_pages):
            self.f.seek(pg * PAGE)
            head = self.f.read(0x30)
            if len(head) < 0x30 or head[0] != 0x02 or head[1] != 0x01:
                continue
            if head[0x28] not in (0x4E,):  # 0x4E = user table
                continue
            try:
                yield pg, self.read_tdef(pg)
            except Exception:
                continue

    # ---------- rows ----------
    def _row_bounds(self, buf, i):
        n = struct.unpack_from("<H", buf, 0x0C)[0]
        off = struct.unpack_from("<H", buf, 0x0E + 2 * i)[0]
        start = off & 0x1FFF
        if i == 0:
            end = PAGE
        else:
            end = struct.unpack_from("<H", buf, 0x0E + 2 * (i - 1))[0] & 0x1FFF
        return off, start, end, n

    def _fetch_row(self, pg, rown):
        buf = self.page(pg)
        off, start, end, _ = self._row_bounds(buf, rown)
        return buf, start, end

    def _lval(self, ptr_bytes, total_len, flags):
        rown = ptr_bytes[0]
        pg = int.from_bytes(ptr_bytes[1:4], "little")
        if flags & 0x40000000:  # single LVAL page
            buf, s, e = self._fetch_row(pg, rown)
            return buf[s:e][:total_len]
        out = bytearray()  # chained LVAL pages
        guard = 0
        while pg and len(out) < total_len and guard < 10000:
            buf, s, e = self._fetch_row(pg, rown)
            row = buf[s:e]
            rown = row[0]
            pg = int.from_bytes(row[1:4], "little")
            out += row[4:]
            guard += 1
        return bytes(out[:total_len])

    def _value(self, c, raw):
        t = c.type
        if t == T_BYTE:
            return raw[0]
        if t == T_INT:
            return struct.unpack("<h", raw[:2])[0]
        if t == T_LONG:
            return struct.unpack("<i", raw[:4])[0]
        if t == T_FLOAT:
            return struct.unpack("<f", raw[:4])[0]
        if t == T_DOUBLE:
            return struct.unpack("<d", raw[:8])[0]
        if t == T_MONEY:
            return struct.unpack("<q", raw[:8])[0] / 10000.0
        if t == T_DATE:
            v = struct.unpack("<d", raw[:8])[0]
            try:
                return (_EPOCH + timedelta(days=v)).strftime("%Y-%m-%d %H:%M:%S")
            except OverflowError:
                return None
        if t == T_TEXT:
            return _decode_text(raw)
        if t == T_MEMO:
            if len(raw) < 12:
                return None
            ln_raw = struct.unpack_from("<I", raw, 0)[0]
            ln = ln_raw & 0x3FFFFFFF
            if ln_raw & 0x80000000:
                data = raw[12:12 + ln]
            else:
                data = self._lval(raw[4:8], ln, ln_raw)
            return _decode_text(data)
        if t == T_GUID:
            return raw[:16].hex()
        if t == T_NUMERIC:
            return None  # not used by the strike table
        return raw.hex()

    def _parse_row(self, cols, row):
        ncols = struct.unpack_from("<H", row, 0)[0]
        mask_len = (ncols + 7) // 8
        mask = row[-mask_len:]
        rend = len(row) - mask_len
        nvar = struct.unpack_from("<H", row, rend - 2)[0]
        var_offs = [struct.unpack_from("<H", row, rend - 4 - 2 * k)[0] for k in range(nvar + 1)]
        out = {}
        for c in cols:
            present = c.num < ncols and (mask[c.num // 8] >> (c.num % 8)) & 1
            if c.type == T_BOOL:
                out[c.name] = bool(present)
                continue
            if not present:
                out[c.name] = None
                continue
            if c.fixed:
                s = 2 + c.fixed_off
                raw = row[s:s + c.length]
            else:
                if c.var_idx >= nvar:
                    out[c.name] = None
                    continue
                raw = row[var_offs[c.var_idx]:var_offs[c.var_idx + 1]]
            try:
                out[c.name] = self._value(c, raw)
            except Exception:
                out[c.name] = None
        return out

    def iter_rows(self, tdef_pg, cols):
        for pg in range(1, self.n_pages):
            self.f.seek(pg * PAGE)
            head = self.f.read(8)
            if head[0] != 0x01 or struct.unpack_from("<I", head, 4)[0] != tdef_pg:
                continue
            buf = self.page(pg)
            n = struct.unpack_from("<H", buf, 0x0C)[0]
            for i in range(n):
                off, start, end, _ = self._row_bounds(buf, i)
                if off & 0x8000:  # deleted
                    continue
                if off & 0x4000:  # overflow pointer
                    ptr = buf[start:start + 4]
                    b2, s2, e2 = self._fetch_row(int.from_bytes(ptr[1:4], "little"), ptr[0])
                    row = b2[s2:e2]
                else:
                    row = buf[start:end]
                if len(row) < 4:
                    continue
                yield self._parse_row(cols, row)


def find_strike_table(db):
    best = None
    for pg, cols in db.find_tables():
        names = {c.name for c in cols}
        if "SPECIES" in names and "DAMAGE_LEVEL" in names or "SPECIES" in names and "DAMAGE" in names:
            if best is None or len(cols) > len(best[1]):
                best = (pg, cols)
    if best is None:
        raise RuntimeError("could not locate the strike table")
    return best


def export_csv(accdb_path, csv_path):
    db = AccessDB(accdb_path)
    pg, cols = find_strike_table(db)
    names = [c.name for c in sorted(cols, key=lambda c: c.num)]
    n = 0
    with open(csv_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=names)
        w.writeheader()
        for r in db.iter_rows(pg, cols):
            # a few free-text remarks contain NUL bytes, which Python < 3.12's csv module cannot write
            w.writerow({k: v.replace("\x00", "") if isinstance(v, str) else v for k, v in r.items()})
            n += 1
    return n, names


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: python pipeline/accdb_reader.py Public.accdb data/raw/strikes.csv")
    n, names = export_csv(sys.argv[1], sys.argv[2])
    print(f"wrote {n:,} rows x {len(names)} columns -> {sys.argv[2]}")
