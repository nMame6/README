// =====================================================
// DB接続・初期化
// =====================================================
//
// このファイルの役割は「SQLiteとのやりとりの入り口」だけに絞る。
// テーブル構造（ER図）:
//
//   boards (1) ── (多) lists (1) ── (多) cards
//
//   boards: id, name
//   lists : id, board_id, name, position
//   cards : id, list_id, text, position
//
// position は「その中での並び順」を表す連番整数（0, 1, 2 ...）。
// -----------------------------------------------------

const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "taskmanager.db");
const db = new Database(DB_PATH);

// 外部キー制約を有効にする（SQLiteはデフォルト無効なので明示する）
db.pragma("foreign_keys = ON");

// ===== テーブル作成（なければ作る） =====
db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lists (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL REFERENCES boards(id),
    name     TEXT NOT NULL,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id  INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    text     TEXT NOT NULL,
    position INTEGER NOT NULL
  );
`);

// ===== 初期データ投入（まだ何もなければ1回だけ） =====
function seedIfEmpty() {
  const boardCount = db.prepare("SELECT COUNT(*) AS n FROM boards").get().n;
  if (boardCount > 0) return; // すでにデータがあれば何もしない

  const insertBoard = db.prepare("INSERT INTO boards (name) VALUES (?)");
  const insertList = db.prepare(
    "INSERT INTO lists (board_id, name, position) VALUES (?, ?, ?)"
  );
  const insertCard = db.prepare(
    "INSERT INTO cards (list_id, text, position) VALUES (?, ?, ?)"
  );

  const seed = db.transaction(() => {
    const boardId = insertBoard.run("マイボード").lastInsertRowid;

    const listDefs = [
      { name: "未着手", key: "todo" },
      { name: "作業中", key: "doing" },
      { name: "完了", key: "done" },
    ];
    const listIds = {};
    listDefs.forEach((def, i) => {
      listIds[def.key] = insertList.run(boardId, def.name, i).lastInsertRowid;
    });

    insertCard.run(listIds.todo, "牛乳を買う", 0);
    insertCard.run(listIds.todo, "部屋を掃除する", 1);
    insertCard.run(listIds.doing, "このアプリを作る", 0);
    insertCard.run(listIds.done, "VS Code をインストール", 0);
  });

  seed();
  console.log("初期データを投入しました。");
}

seedIfEmpty();

module.exports = db;
