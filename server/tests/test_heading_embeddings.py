import unittest

from app.services.embeddings import embed_heading_text
from app.models import HEADING_EMBEDDING_DIMENSION


def cosine(a, b):
    return sum(x * y for x, y in zip(a, b))


class HeadingEmbeddingTests(unittest.TestCase):
    def test_embedding_has_expected_dimension(self):
        vec = embed_heading_text("Photosynthesis Overview")
        self.assertEqual(len(vec), HEADING_EMBEDDING_DIMENSION)

    def test_embedding_is_deterministic(self):
        vec1 = embed_heading_text("Cellular Respiration")
        vec2 = embed_heading_text("Cellular Respiration")
        self.assertEqual(vec1, vec2)

    def test_related_headings_are_more_similar_than_unrelated(self):
        base = embed_heading_text("Photosynthesis and Cellular Respiration")
        related = embed_heading_text("Cellular Respiration in Mitochondria")
        unrelated = embed_heading_text("French Revolution Timeline")

        sim_related = cosine(base, related)
        sim_unrelated = cosine(base, unrelated)

        self.assertGreater(sim_related, sim_unrelated)

    def test_empty_text_returns_zero_vector(self):
        vec = embed_heading_text("")
        self.assertEqual(vec, [0.0] * HEADING_EMBEDDING_DIMENSION)


if __name__ == "__main__":
    unittest.main()
