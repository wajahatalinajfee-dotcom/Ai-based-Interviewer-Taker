"""Text analysis: tokenization, stemming, stop words, filler/hedge detection, technical terms."""
import re
from nltk.stem import PorterStemmer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

_stemmer = PorterStemmer()
_TOKEN = re.compile(r"[^\W_]+(?:'[^\W_]+)?", re.UNICODE)   # letters and digits in any script, incl. Urdu
_SENT = re.compile(r"[.!?۔؟\n]+")

STOP_UR = {"کا", "کی", "کے", "میں", "ہے", "ہیں", "اور", "سے", "کو", "یہ", "وہ", "نے", "پر", "تو", "بھی", "کہ",
           "ایک", "جو", "کر", "ہو", "تھا", "تھی", "گا", "گی", "گے", "لیے", "ہوتا", "ہوتی", "جاتا", "جاتی"}
# Starter lists (English, Roman Urdu, Urdu script). Extend them as you collect real transcripts.
FILLERS = ["um", "umm", "uh", "uhh", "erm", "hmm", "you know", "i mean", "basically", "actually", "kind of", "sort of",
           "matlab", "yani", "yaani", "acha", "مطلب", "یعنی", "اچھا", "ہمم"]
HEDGES = ["maybe", "perhaps", "i think", "i guess", "probably", "not sure", "i believe", "might", "possibly",
          "shayad", "mera khayal", "lagta hai", "شاید", "میرا خیال ہے", "لگتا ہے"]
TECH_TERMS = {
    "react", "node", "express", "mongodb", "mongoose", "jwt", "rest", "api", "angular", "rxjs", "typescript", "javascript",
    "closure", "closures", "promise", "async", "await", "callback", "hook", "hooks", "usestate", "useeffect", "redux",
    "index", "indexes", "aggregation", "schema", "middleware", "event loop", "scope", "hoisting", "prototype",
    "component", "props", "state", "virtual dom", "observable", "dependency injection", "service", "routing",
    "llm", "token", "tokens", "embedding", "embeddings", "rag", "prompt", "overfitting", "precision", "recall",
    "hallucination", "fine-tuning", "vector", "transformer", "cors", "authentication", "authorization", "cache",
}


def tokenize(text: str) -> list[str]:
    return _TOKEN.findall(text.lower())


def sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENT.split(text) if s.strip()]


def content_stems(text: str) -> list[str]:
    """Lowercase, drop stop words and numbers, stem English words (Urdu words are kept as they are)."""
    out = []
    for t in tokenize(text):
        if len(t) < 2 or t.isdigit() or t in STOP_UR or t in ENGLISH_STOP_WORDS:
            continue
        out.append(_stemmer.stem(t) if t.isascii() else t)
    return out


def count_phrases(text: str, phrases: list[str]) -> dict[str, int]:
    low, found = text.lower(), {}
    for p in phrases:
        n = len(re.findall(r"(?<!\w)" + re.escape(p) + r"(?!\w)", low))
        if n:
            found[p] = n
    return found


def tech_terms(text: str) -> list[str]:
    toks, low = set(tokenize(text)), text.lower()
    return sorted(t for t in TECH_TERMS if (t in low if " " in t else t in toks))


def richness(stems: list[str]) -> float:
    """Type-token ratio of content words: 1.0 means no repeated words."""
    return round(len(set(stems)) / len(stems), 3) if stems else 0.0
