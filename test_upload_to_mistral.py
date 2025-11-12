import unittest
import os
from get_captions import upload_to_mistral, process_response

class TestUploadToMistral(unittest.TestCase):
    def test_upload_to_mistral_flickr(self):
        # Test file path
        test_file_path = 'DSC_2570.jpg'

        # Verify the test file exists
        self.assertTrue(os.path.exists(test_file_path), f"Test file {test_file_path} not found")

        # Call the function to test
        result = upload_to_mistral(test_file_path, "flickr")

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

        print(f"Caption: {result['caption']}")
        print(f"Tags: {result['tags']}")
    
    def test_upload_to_mistral_instagram(self):
        # Test file path
        test_file_path = 'DSC_2570.jpg'

        # Verify the test file exists
        self.assertTrue(os.path.exists(test_file_path), f"Test file {test_file_path} not found")

        # Call the function to test
        result = upload_to_mistral(test_file_path, "instagram")

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

        print(f"Caption: {result['caption']}")
        print(f"Tags: {result['tags']}")

    def test_upload_to_mistral_reddit(self):
        # Test file path
        test_file_path = 'DSC_2570.jpg'

        # Verify the test file exists
        self.assertTrue(os.path.exists(test_file_path), f"Test file {test_file_path} not found")

        # Call the function to test
        result = upload_to_mistral(test_file_path, "reddit")

        # Verify the upload was successful
        self.assertIsNotNone(result)
        self.assertIsInstance(result, dict)
        self.assertIn('success', result)
        self.assertTrue(result['success'])
        self.assertIn('filename', result)
        self.assertEqual(result['filename'], test_file_path)
        self.assertIn('subreddits', result)
        self.assertIsInstance(result['subreddits'], list)
        self.assertIn('caption', result['subreddits'][0])
        self.assertIsInstance(result['subreddits'][0]['caption'], str)
        self.assertIn('subreddit', result['subreddits'][0])
        self.assertIsInstance(result['subreddits'][0]['subreddit'], str)

        for subreddit in result['subreddits']:
            print(f"Subreddit: {subreddit['subreddit']}")
            print(f"Caption: {subreddit['caption']}")
        

class TestResponseProcessing(unittest.TestCase):
    # Test case for Reddit response processing
    def test_reddit_response_processing(self):
        # Sample Reddit response
        sample_response = {
            "choices": [{
                "message": {
                    "content": """```json
                    [
                        {
                            "subreddit": "r/aww",
                            "caption": "Cute puppy playing in the park"
                        },
                        {
                            "subreddit": "r/cats",
                            "caption": "Sleepy cat napping on a windowsill"
                        }
                    ]
                    ```"""
                }
            }]
        }

        # Mock response object
        class MockResponse:
            def __init__(self, status_code, json_data):
                self.status_code = status_code
                self.json_data = json_data

            def json(self):
                return self.json_data

        # Create mock response
        mock_response = MockResponse(200, sample_response)

        # Call process_response function
        result = process_response(mock_response, "test.jpg", "reddit")

        # Verify the result
        self.assertTrue(result["success"])
        self.assertEqual(result["filename"], "test.jpg")
        self.assertEqual(result["platform"], "reddit")
        self.assertEqual(len(result["subreddits"]), 2)
        self.assertEqual(result["subreddits"][0]["subreddit"], "r/aww")
        self.assertEqual(result["subreddits"][0]["caption"], "Cute puppy playing in the park")
        self.assertEqual(result["subreddits"][1]["subreddit"], "r/cats")
        self.assertEqual(result["subreddits"][1]["caption"], "Sleepy cat napping on a windowsill")

        print("Reddit response processing test passed!")

    # Test case for non-Reddit response processing
    def test_non_reddit_response_processing(self):
        # Sample non-Reddit response
        sample_response = {
            "choices": [{
                "message": {
                    "content": """```json
                    {
                        "caption": "Beautiful sunset over the ocean",
                        "tags": ["nature", "sunset", "ocean"]
                    }
                    ```"""
                }
            }]
        }

        # Mock response object
        class MockResponse:
            def __init__(self, status_code, json_data):
                self.status_code = status_code
                self.json_data = json_data

            def json(self):
                return self.json_data

        # Create mock response
        mock_response = MockResponse(200, sample_response)

        # Call process_response function
        result = process_response(mock_response, "test.jpg", "instagram")

        # Verify the result
        self.assertTrue(result["success"])
        self.assertEqual(result["filename"], "test.jpg")
        self.assertEqual(result["platform"], "instagram")
        self.assertEqual(result["caption"], "Beautiful sunset over the ocean")
        self.assertEqual(result["tags"], ["nature", "sunset", "ocean"])

        print("Non-Reddit response processing test passed!")

if __name__ == '__main__':
    unittest.main()