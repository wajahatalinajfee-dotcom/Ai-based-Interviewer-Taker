import os
import threading


class LazyEmbedder:
    """Loads a multilingual sentence-embedding model in the background. Without it the service still works (lexical only)."""

    def __init__(self):
        self.model_name = os.getenv("NLP_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")
        self.state = "disabled" if os.getenv("NLP_EMBED", "1") == "0" else "loading"
        self.error = ""
        self._model = None

    def start(self):
        if self.state == "loading":
            threading.Thread(target=self._load, daemon=True).start()

    def _load(self):
        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name)
            self.state = "ready"
        except Exception as e:  # not installed, offline, out of memory...
            self.state, self.error = "unavailable", str(e)[:200]

    def ready(self) -> bool:
        return self.state == "ready"

    def encode(self, texts):
        return self._model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
