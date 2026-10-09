/**
 * Minimal in-memory stand-in for the Supabase client used by server actions.
 * It emulates Row Level Security for user-owned tables (rows are only visible
 * to their owner), which lets tests assert that actions never touch someone
 * else's data. It is not a general-purpose Supabase mock.
 */
type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

const OWNED = new Set(["trips", "trip_photos", "published_memories", "profiles"]);

export interface FakeState {
  userId: string | null;
  tables: Record<string, Row[]>;
  storage: Map<string, { size: number; contentType: string }>;
  removed: string[];
}

export function createFakeState(): FakeState {
  return { userId: null, tables: { trips: [], trip_photos: [], published_memories: [], profiles: [] }, storage: new Map(), removed: [] };
}

let counter = 0;
const now = () => new Date(Date.now() + counter++).toISOString();

type Result = { data: unknown; error: unknown; count?: number };

class Query {
  private filters: Filter[] = [];
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row | null = null;
  private singleMode: "one" | "maybe" | null = null;
  private wantCount = false;
  private head = false;
  private limitN: number | null = null;
  private orderBy: Array<{ col: string; asc: boolean }> = [];

  constructor(
    private state: FakeState,
    private table: string,
  ) {}

  private visible(): Row[] {
    const rows = this.state.tables[this.table] ?? [];
    if (!OWNED.has(this.table)) return rows;
    const ownerKey = this.table === "profiles" ? "id" : "owner_id";
    return rows.filter((r) => r[ownerKey] === this.state.userId);
  }

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    this.wantCount = Boolean(opts?.count);
    this.head = Boolean(opts?.head);
    return this;
  }
  insert(row: Row) {
    this.mode = "insert";
    this.payload = row;
    return this;
  }
  update(row: Row) {
    this.mode = "update";
    this.payload = row;
    return this;
  }
  delete(opts?: { count?: string }) {
    this.mode = "delete";
    this.wantCount = Boolean(opts?.count);
    return this;
  }
  eq(col: string, value: unknown) {
    this.filters.push((r) => r[col] === value);
    return this;
  }
  in(col: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[col]));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }
  single() {
    this.singleMode = "one";
    return this;
  }

  private run(): Result {
    const all = this.state.tables[this.table];
    let rows = this.visible().filter((r) => this.filters.every((f) => f(r)));

    if (this.mode === "insert") {
      const row: Row = { id: crypto.randomUUID(), created_at: now(), updated_at: now(), ...this.payload };
      if (OWNED.has(this.table) && row.owner_id !== this.state.userId) return { data: null, error: { message: "RLS violation" } };
      if (this.table === "published_memories") row.published_at ??= now();
      all.push(row);
      rows = [row];
    } else if (this.mode === "update") {
      for (const r of rows) Object.assign(r, this.payload, { updated_at: now() });
    } else if (this.mode === "delete") {
      const count = rows.length;
      this.state.tables[this.table] = all.filter((r) => !rows.includes(r));
      return { data: null, error: null, count };
    }

    for (const { col, asc } of [...this.orderBy].reverse()) {
      rows = [...rows].sort((a, b) => (a[col] === b[col] ? 0 : (a[col] as never) > (b[col] as never) ? (asc ? 1 : -1) : asc ? -1 : 1));
    }
    if (this.limitN !== null) rows = rows.slice(0, this.limitN);
    const count = rows.length;
    if (this.head) return { data: null, error: null, count };
    if (this.singleMode === "one") return rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: "No rows" } };
    if (this.singleMode === "maybe") return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null, ...(this.wantCount ? { count } : {}) };
  }

  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): Promise<A | B> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

export function createFakeClient(state: FakeState) {
  return {
    auth: {
      getClaims: async () => ({ data: state.userId ? { claims: { sub: state.userId } } : null, error: null }),
    },
    from: (table: string) => new Query(state, table),
    storage: {
      from: () => ({
        info: async (path: string) => {
          const obj = state.storage.get(path);
          return obj ? { data: { size: obj.size, contentType: obj.contentType }, error: null } : { data: null, error: { message: "not found" } };
        },
        remove: async (paths: string[]) => {
          for (const p of paths) {
            state.storage.delete(p);
            state.removed.push(p);
          }
          return { data: [], error: null };
        },
        createSignedUrls: async (paths: string[]) => ({
          data: paths.filter((p) => p.startsWith(`${state.userId}/`)).map((p) => ({ path: p, signedUrl: `https://signed.test/${p}`, error: null })),
          error: null,
        }),
      }),
    },
  };
}
