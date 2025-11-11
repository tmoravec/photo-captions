import unittest
import os
from get_captions import upload_to_mistral

class TestUploadToMistral(unittest.TestCase):
    def test_upload_to_mistral(self):
        # Test file path
        test_file_path = 'DSC_2570.jpg'

        # Verify the test file exists
        self.assertTrue(os.path.exists(test_file_path), f"Test file {test_file_path} not found")

        # Call the function to test
        result = upload_to_mistral(test_file_path)

        # Verify the upload was successful
        self.assertIsNotNone(result)
        self.assertIsInstance(result, dict)
        self.assertIn('success', result)
        self.assertTrue(result['success'])
        self.assertIn('filename', result)
        self.assertEqual(result['filename'], test_file_path)
        self.assertIn('caption', result)
        self.assertIsInstance(result['caption'], str)
        self.assertIn('tags', result)
        self.assertIsInstance(result['tags'], list)

if __name__ == '__main__':
    unittest.main()
