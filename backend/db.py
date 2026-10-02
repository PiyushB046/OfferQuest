"""SQLite persistence: students, quests (Quest File as JSON), messages, events, LLM cache."""
from __future__ import annotations

import json
import os
import shutil
import sqlite3
import threading
from pathlib import Path

from .models import QuestFile, StudentProfile

SCHEMA = """
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quests (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, data TEXT NOT NULL,
                                   updated TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, quest_id TEXT NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, quest_id TEXT NOT NULL,
                                   data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS llm_cache (key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""


class DB:
    def __init__(self, data_dir: str | os.PathLike | None = None):
        self.data_dir = Path(data_dir or os.environ.get("OFFERQUEST_DATA", "data"))
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.data_dir / "offerquest.db", check_same_thread=False)
        self._lock = threading.Lock()
        self._conn.executescript(SCHEMA)

    def _exec(self, sql: str, args: tuple = ()) -> sqlite3.Cursor:
        with self._lock:
            cur = self._conn.execute(sql, args)
            self._conn.commit()
            return cur

    def _all(self, sql: str, args: tuple = ()) -> list[tuple]:
        with self._lock:
            return self._conn.execute(sql, args).fetchall()

    # students
    def save_student(self, s: StudentProfile, now: str) -> None:
        self._exec("INSERT OR REPLACE INTO students VALUES (?,?,?)", (s.id, s.model_dump_json(), now))

    def get_student(self, sid: str) -> StudentProfile | None:
        rows = self._all("SELECT data FROM students WHERE id=?", (sid,))
        return StudentProfile.model_validate_json(rows[0][0]) if rows else None

    def list_students(self) -> list[dict]:
        out = []
        for data, updated in self._all("SELECT data, updated FROM students ORDER BY updated DESC"):
            s = json.loads(data)
            n = self._all("SELECT COUNT(*) FROM quests WHERE student_id=?", (s["id"],))[0][0]
            out.append({"id": s["id"], "name": s["name"], "college": s.get("college", ""),
                        "preferences": s.get("preferences", {}), "quests": n, "last_played": updated})
        return out

    def delete_student(self, sid: str) -> None:
        """Privacy (§20): remove the student and everything derived from them."""
        for (qid,) in self._all("SELECT id FROM quests WHERE student_id=?", (sid,)):
            self._exec("DELETE FROM messages WHERE quest_id=?", (qid,))
            self._exec("DELETE FROM events WHERE quest_id=?", (qid,))
            shutil.rmtree(self.quest_dir(qid), ignore_errors=True)
            self._forget_checkpoints(qid)
        self._exec("DELETE FROM quests WHERE student_id=?", (sid,))
        self._exec("DELETE FROM students WHERE id=?", (sid,))

    # quests
    def next_quest_id(self) -> str:
        ids = [int(i.split("_")[1]) for (i,) in self._all("SELECT id FROM quests") if i.split("_")[1].isdigit()]
        return f"quest_{max(ids, default=0) + 1:03d}"

    def save_quest(self, qf: QuestFile, now: str) -> None:
        self._exec("INSERT OR REPLACE INTO quests VALUES (?,?,?,?)",
                   (qf.quest.id, qf.quest.student_id, qf.model_dump_json(), now))

    def get_quest(self, qid: str) -> QuestFile | None:
        rows = self._all("SELECT data FROM quests WHERE id=?", (qid,))
        return QuestFile.model_validate_json(rows[0][0]) if rows else None

    def list_quests(self, student_id: str | None = None) -> list[dict]:
        sql = "SELECT data, updated FROM quests"
        args: tuple = ()
        if student_id:
            sql, args = sql + " WHERE student_id=?", (student_id,)
        out = []
        for data, updated in self._all(sql + " ORDER BY updated DESC", args):
            q = json.loads(data)
            out.append({"id": q["quest"]["id"], "student_id": q["quest"]["student_id"],
                        "company": q["quest"]["company"], "role": q["quest"]["role"],
                        "stage": q["quest"]["stage"], "status": q["status"],
                        "readiness": (q.get("readiness") or {}).get("score"), "updated": updated})
        return out

    def quest_files(self, student_id: str) -> list[QuestFile]:
        return [QuestFile.model_validate_json(r[0]) for r in
                self._all("SELECT data FROM quests WHERE student_id=? ORDER BY updated", (student_id,))]

    def running_quests(self) -> list[QuestFile]:
        return [qf for (d,) in self._all("SELECT data FROM quests")
                if (qf := QuestFile.model_validate_json(d)).status == "running"]

    def _forget_checkpoints(self, qid: str) -> None:
        path = self.data_dir / "checkpoints.db"
        if not path.exists():
            return
        with sqlite3.connect(path) as conn:
            for table in ("checkpoints", "writes"):
                try:
                    conn.execute(f"DELETE FROM {table} WHERE thread_id=?", (qid,))
                except sqlite3.OperationalError:
                    pass

    def quest_dir(self, qid: str) -> Path:
        d = self.data_dir / "quests" / qid
        d.mkdir(parents=True, exist_ok=True)
        return d

    # messages / events
    def add_message(self, mid: str, quest_id: str, data: dict) -> None:
        self._exec("INSERT OR REPLACE INTO messages VALUES (?,?,?)", (mid, quest_id, json.dumps(data)))

    def messages(self, quest_id: str) -> list[dict]:
        return [json.loads(r[0]) for r in
                self._all("SELECT data FROM messages WHERE quest_id=? ORDER BY rowid", (quest_id,))]

    def add_event(self, quest_id: str, data: dict) -> int:
        return self._exec("INSERT INTO events (quest_id, data) VALUES (?,?)",
                          (quest_id, json.dumps(data))).lastrowid or 0

    def events(self, quest_id: str) -> list[dict]:
        return [dict(json.loads(d), seq=s) for s, d in
                self._all("SELECT seq, data FROM events WHERE quest_id=? ORDER BY seq", (quest_id,))]

    # llm cache
    def cache_get(self, key: str) -> str | None:
        rows = self._all("SELECT value FROM llm_cache WHERE key=?", (key,))
        return rows[0][0] if rows else None

    def cache_set(self, key: str, value: str) -> None:
        self._exec("INSERT OR REPLACE INTO llm_cache VALUES (?,?)", (key, value))
