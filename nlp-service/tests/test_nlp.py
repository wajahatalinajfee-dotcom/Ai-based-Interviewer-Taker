import numpy as np
from fastapi.testclient import TestClient
from app.main import create_app
from app.scoring import coverage, nlp_score, stem_recall
from app.text import content_stems, count_phrases, FILLERS, HEDGES, tech_terms, tokenize

RUBRIC = ["closures capture variables from the outer scope", "can cause memory leaks if references are kept"]
GOOD = "A closure captures variables from the outer scope. It can cause memory leaks when references are kept alive."
OFF = "I like building websites with nice colors and fonts."


class FakeEmbedder:
    """Tiny bag-of-words embedder with a synonym map, so tests can show semantic scoring beyond word overlap."""
    state, model_name = "ready", "fake"
    SYN = {"memoize": "cache", "memoise": "cache", "remember": "cache"}

    def ready(self):
        return True

    def encode(self, texts):
        toks = [[self.SYN.get(w, w) for w in tokenize(t)] for t in texts]
        vocab = sorted({w for t in toks for w in t})
        return np.array([[t.count(w) for w in vocab] for t in toks], dtype=float)


def test_tokenizes_english_and_urdu():
    assert tokenize("Hello, React's hooks!") == ["hello", "react's", "hooks"]
    assert tokenize("یہ ایک ٹیسٹ ہے۔") == ["یہ", "ایک", "ٹیسٹ", "ہے"]


def test_stemming_matches_word_forms_and_drops_stop_words():
    assert content_stems("caching") == content_stems("caches") == ["cach"]
    assert "the" not in content_stems("the cache") and "ہے" not in content_stems("کیشے ہے")


def test_counts_fillers_and_hedges_in_three_scripts():
    assert count_phrases("Um, basically I think, you know, it works", FILLERS) == {"um": 1, "you know": 1, "basically": 1}
    assert count_phrases("matlab yani it is fine", FILLERS) == {"matlab": 1, "yani": 1}
    assert count_phrases("میرا خیال ہے شاید یہ ٹھیک ہے", HEDGES) == {"شاید": 1, "میرا خیال ہے": 1}
    assert count_phrases("I think maybe, I think so", HEDGES) == {"maybe": 1, "i think": 2}
    assert count_phrases("umbrella", FILLERS) == {}  # whole words only


def test_finds_technical_terms():
    assert tech_terms("We used React with MongoDB and the event loop") == ["event loop", "mongodb", "react"]


def test_lexical_coverage_separates_good_from_off_topic():
    good, used = coverage(GOOD, RUBRIC)
    assert not used and all(r["covered"] for r in good) and nlp_score(good) == 10.0
    off, _ = coverage(OFF, RUBRIC)
    assert not any(r["covered"] for r in off) and nlp_score(off) == 0.0
    half, _ = coverage("A closure captures variables from the outer scope.", RUBRIC)
    assert nlp_score(half) == 5.0


def test_empty_or_unusable_rubric_gives_no_score():
    assert nlp_score(coverage("anything", [])[0]) is None
    assert nlp_score(coverage("anything", ["a", "the"])[0]) is None


def test_semantic_scoring_catches_synonyms_that_word_overlap_misses():
    point, answer = ["use a cache"], "We memoize results."
    assert stem_recall(answer, point[0]) == 0.0  # no shared words
    rows, used = coverage(answer, point, FakeEmbedder())
    assert used and rows[0]["tfidf"] == 0.0 and rows[0]["semantic"] > 0.3  # meaning matched without matching words


def test_api_analyze_and_health():
    c = TestClient(create_app(FakeEmbedder()))
    assert c.get("/health").json()["embeddings"] == "ready"
    r = c.post("/analyze", json={"text": "Um, " + GOOD, "rubric": RUBRIC}).json()
    assert r["source"] == "python" and r["fillers"]["count"] == 1 and r["nlp_score"] == 10.0 and r["semantic_used"]
    assert r["words"] > 10 and r["sentences"] == 2 and "scope" in r["terms"]
    assert c.post("/analyze", json={"text": "x" * 7000}).status_code == 422
    assert c.post("/analyze", json={"text": "hi"}).json()["nlp_score"] is None
