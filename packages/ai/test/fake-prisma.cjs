// In-memory stand-in for the slice of PrismaClient the services use.
// Every method mutates synchronously and returns a resolved promise, so the
// array form of $transaction([...]) runs its operations in call order.
const { prisma } = require("@interviewiq/db");

let nextId = 0;
const newId = (prefix) => `${prefix}_${++nextId}`;

function matches(row, where = {}) {
  return Object.entries(where).every(([key, cond]) => {
    const value = row[key];
    if (cond !== null && typeof cond === "object") {
      if ("not" in cond && value === cond.not) return false;
      if ("gt" in cond && !(value > cond.gt)) return false;
      return true;
    }
    return value === cond;
  });
}

function applyData(row, data) {
  for (const [key, value] of Object.entries(data)) {
    row[key] =
      value !== null && typeof value === "object" && "increment" in value
        ? row[key] + value.increment
        : value;
  }
  return row;
}

function notFound() {
  const error = new Error("Record to update not found.");
  error.code = "P2025";
  return error;
}

const QUESTION_DEFAULTS = {
  stage: null,
  metadata: null,
  score: null,
  transcript: null,
  feedback: null,
  strengths: null,
  gaps: null,
};

function createStore() {
  const db = { sessions: [], questions: [], reports: [], coachNotes: [] };
  const copy = (row) => (row ? { ...row } : null);

  const delegates = {
    session: {
      async findUnique({ where }) {
        return copy(db.sessions.find((s) => matches(s, where)));
      },
      async updateMany({ where, data }) {
        const rows = db.sessions.filter((s) => matches(s, where));
        rows.forEach((s) => applyData(s, data));
        return { count: rows.length };
      },
      async update({ where, data }) {
        const row = db.sessions.find((s) => matches(s, where));
        if (!row) throw notFound();
        return copy(applyData(row, data));
      },
    },
    question: {
      async findMany({ where, orderBy } = {}) {
        const rows = db.questions.filter((q) => matches(q, where));
        if (orderBy?.order) {
          rows.sort((a, b) => (orderBy.order === "asc" ? a.order - b.order : b.order - a.order));
        }
        return rows.map(copy);
      },
      async createMany({ data }) {
        for (const row of data) db.questions.push({ id: newId("q"), ...QUESTION_DEFAULTS, ...row });
        return { count: data.length };
      },
      async create({ data }) {
        const row = { id: newId("q"), ...QUESTION_DEFAULTS, ...data };
        db.questions.push(row);
        return copy(row);
      },
      async update({ where, data }) {
        const row = db.questions.find((q) => matches(q, where));
        if (!row) throw notFound();
        return copy(applyData(row, data));
      },
      async updateMany({ where, data }) {
        const rows = db.questions.filter((q) => matches(q, where));
        rows.forEach((q) => applyData(q, data));
        return { count: rows.length };
      },
      async deleteMany({ where }) {
        const before = db.questions.length;
        db.questions = db.questions.filter((q) => !matches(q, where));
        return { count: before - db.questions.length };
      },
    },
    report: {
      async findUnique({ where }) {
        return copy(db.reports.find((r) => matches(r, where)));
      },
      async upsert({ where, update, create }) {
        const row = db.reports.find((r) => matches(r, where));
        if (row) return copy(applyData(row, update));
        const created = { id: newId("r"), ...create };
        db.reports.push(created);
        return copy(created);
      },
    },
    coachNote: {
      async findMany({ where } = {}) {
        return db.coachNotes.filter((n) => matches(n, where)).map(copy);
      },
    },
  };

  return { db, delegates };
}

const ORIGINAL_KEYS = ["session", "question", "report", "coachNote", "$transaction"];

/**
 * Point the shared `prisma` singleton at a fresh in-memory store for one test.
 * Pass `t` to restore the real delegates when the test ends.
 */
function installFakePrisma(t) {
  const store = createStore();
  const saved = Object.fromEntries(ORIGINAL_KEYS.map((k) => [k, prisma[k]]));
  Object.assign(prisma, store.delegates);
  prisma.$transaction = async (ops) => Promise.all(ops);
  t?.after(() => Object.assign(prisma, saved));
  return store;
}

module.exports = { installFakePrisma, newId };
