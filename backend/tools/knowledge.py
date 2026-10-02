"""Knowledge notes in ChromaDB: what the crew learned on earlier quests, findable by meaning.

Embeddings are computed locally by feature hashing (words and word pairs → a fixed-size vector).
That needs no model download and no network, which matters on a student laptop; the collection
takes any vectors, so a neural embedder can replace `embed` later without touching callers.
"""
from __future__ import annotations

import math
import zlib
from pathlib import Path

from .lexicon import tokens

DIM = 384


def embed(text: str) -> list[float]:
    words = tokens(text)
    vec = [0.0] * DIM
    for feat in words + [f"{a} {b}" for a, b in zip(words, words[1:])]:
        h = zlib.crc32(feat.encode())
        vec[h % DIM] += 1.0 if (h >> 16) & 1 else -1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


class Knowledge:
    _open: dict[str, "Knowledge"] = {}

    def __init__(self, data_dir: Path):
        self.col = None
        try:
            import chromadb
            from chromadb.config import Settings
            client = chromadb.PersistentClient(path=str(data_dir / "chroma"),
                                               settings=Settings(anonymized_telemetry=False))
            self.col = client.get_or_create_collection("notes", embedding_function=None,
                                                       metadata={"hnsw:space": "cosine"})
        except Exception:  # noqa: BLE001 - notes are a bonus; a quest must run without them
            self.col = None

    @classmethod
    def for_dir(cls, data_dir: Path) -> "Knowledge":
        key = str(data_dir.resolve())
        if key not in cls._open:
            cls._open[key] = cls(data_dir)
        return cls._open[key]

    def add(self, note_id: str, text: str, meta: dict[str, str]) -> None:
        if self.col is not None:
            self.col.upsert(ids=[note_id], embeddings=[embed(text)], documents=[text[:4000]], metadatas=[meta])

    def similar(self, text: str, student_id: str, exclude_quest: str, limit: int = 3) -> list[dict]:
        """Earlier notes for this student, closest first. `distance` is cosine distance (0 = identical)."""
        if self.col is None or self.col.count() == 0:
            return []
        res = self.col.query(query_embeddings=[embed(text)], n_results=limit + 1, where={"student_id": student_id})
        out = [{"meta": m, "text": d, "distance": round(dist, 3)}
               for m, d, dist in zip(res["metadatas"][0], res["documents"][0], res["distances"][0])
               if m.get("quest_id") != exclude_quest]
        return out[:limit]

    def forget(self, student_id: str) -> None:
        if self.col is not None:
            self.col.delete(where={"student_id": student_id})
