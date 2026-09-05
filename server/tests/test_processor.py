import unittest

from app.processor import process_notes


class ProcessorTests(unittest.TestCase):
    def test_process_notes_returns_generated_note_for_structured_text(self):
        result = process_notes(
            'Photosynthesis: Plants convert light energy into chemical energy.\n\n'
            'Cellular respiration: Cells use glucose to produce ATP.'
        )

        self.assertEqual(result['pipeline']['chunkCount'], 2)
        self.assertGreater(result['pipeline']['topicCount'], 0)
        self.assertTrue(result['rag']['title'])
        self.assertTrue(result['rag']['draft'])


if __name__ == '__main__':
    unittest.main()