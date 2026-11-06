"""Rubric coverage: which key points of the model answer did the candidate actually address?"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from .text import content_stems, sentences

LEXICAL_THRESHOLD = 0.40   # to be tuned with evaluation/evaluate.py
HYBRID_THRESHOLD = 0.45


def stem_recall(answer: str, point: str) -> float:
    """Share of the rubric point's content stems that appear in the answer."""
    p, a = set(content_stems(point)), set(content_stems(answer))
    return len(p & a) / len(p) if p else 0.0


def tfidf_best(answer: str, point: str) -> float:
    """Highest TF-IDF cosine similarity between the rubric point and any sentence of the answer."""
    docs = [point] + (sentences(answer) or [answer])
    try:
        m = TfidfVectorizer(analyzer=content_stems).fit(docs).transform(docs)
    except ValueError:  # nothing left after stop-word removal
        return 0.0
    return float((m[1:] @ m[0].T).toarray().max())


def semantic_best(embedder, answer: str, point: str) -> float:
    """Highest embedding cosine similarity between the rubric point and any sentence of the answer."""
    sents = sentences(answer) or [answer]
    v = np.asarray(embedder.encode([point] + sents + [answer]), dtype=float)
    v = v / np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-9)
    return float((v[1:] @ v[0]).max())


def coverage(answer: str, rubric: list[str], embedder=None):
    use_sem = embedder is not None and embedder.ready()
    threshold = HYBRID_THRESHOLD if use_sem else LEXICAL_THRESHOLD
    rows = []
    for point in rubric:
        if not content_stems(point):
            continue
        rec, tf = stem_recall(answer, point), tfidf_best(answer, point)
        lex = 0.5 * rec + 0.5 * tf
        sem = semantic_best(embedder, answer, point) if use_sem else None
        score = 0.4 * lex + 0.6 * max(sem, 0.0) if use_sem else lex
        rows.append({"point": point, "recall": round(rec, 3), "tfidf": round(tf, 3),
                     "semantic": None if sem is None else round(sem, 3), "score": round(score, 3), "covered": score >= threshold})
    return rows, use_sem


def nlp_score(rows):
    """0-10: the share of rubric points covered. None when there is nothing to score against."""
    return round(10 * sum(r["covered"] for r in rows) / len(rows), 1) if rows else None
