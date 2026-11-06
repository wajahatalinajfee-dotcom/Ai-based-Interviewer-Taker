from fastapi import FastAPI
from pydantic import BaseModel, Field
from .embeddings import LazyEmbedder
from .scoring import coverage, nlp_score
from .text import FILLERS, HEDGES, content_stems, count_phrases, richness, sentences, tech_terms, tokenize


class AnalyzeIn(BaseModel):
    text: str = Field(max_length=6000)
    lang: str = "en"
    rubric: list[str] = Field(default_factory=list, max_length=12)


def create_app(embedder=None) -> FastAPI:
    app = FastAPI(title="Yawaq NLP service")
    emb = embedder or LazyEmbedder()
    if embedder is None:
        emb.start()

    @app.get("/health")
    def health():
        return {"ok": True, "embeddings": emb.state, "model": getattr(emb, "model_name", None), "error": getattr(emb, "error", "")}

    @app.post("/analyze")
    def analyze(body: AnalyzeIn):
        text = body.text.strip()
        words, sents, stems = tokenize(text), sentences(text), content_stems(text)
        fillers, hedges = count_phrases(text, FILLERS), count_phrases(text, HEDGES)
        rows, used = coverage(text, [p[:300] for p in body.rubric], emb)
        return {
            "source": "python", "lang": body.lang, "words": len(words), "sentences": len(sents),
            "avg_sentence_len": round(len(words) / len(sents), 1) if sents else 0, "vocab_richness": richness(stems),
            "fillers": {"count": sum(fillers.values()), "items": fillers},
            "hedges": {"count": sum(hedges.values()), "items": hedges},
            "terms": tech_terms(text), "coverage": rows, "semantic_used": used, "nlp_score": nlp_score(rows),
        }

    return app
