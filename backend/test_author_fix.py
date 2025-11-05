#!/usr/bin/env python3
"""
Test script to verify author extraction fix.
Tests a single feed URL to see if itunes_author is correctly extracted.
"""

import feedparser
import httpx

# Test with the Aunt Milly's Diamonds feed
TEST_FEED = "https://www.spreaker.com/show/6103808/episodes/feed"

def test_author_extraction():
    print("Testing author extraction fix...")
    print(f"Feed URL: {TEST_FEED}\n")
    
    # Fetch the feed
    with httpx.Client(timeout=20, http2=False, follow_redirects=True) as client:
        r = client.get(TEST_FEED)
        r.raise_for_status()
        content = r.content
    
    # Check raw XML for itunes:author
    print("=== Raw XML Check ===")
    if b'itunes:author' in content:
        import re
        match = re.search(rb'<itunes:author[^>]*>(.*?)</itunes:author>', content, re.IGNORECASE | re.DOTALL)
        if match:
            raw_author = match.group(1).decode('utf-8').strip()
            print(f"Found in raw XML: '{raw_author}'")
    print()
    
    parsed = feedparser.parse(content)
    
    # Show what feedparser extracted
    print("=== FeedParser Results ===")
    print(f"Title: {parsed.feed.get('title')}")
    print(f"'author' field: {parsed.feed.get('author')}")
    print(f"'itunes_author' field: {parsed.feed.get('itunes_author')}")
    print(f"'copyright' field: {parsed.feed.get('copyright')}")
    print(f"'rights' field: {parsed.feed.get('rights')}")
    print()
    
    # Check for itunes namespace fields
    print("=== Checking iTunes Namespace ===")
    itunes_fields = [k for k in parsed.feed.keys() if 'itunes' in k.lower()]
    print(f"iTunes-related fields: {itunes_fields}")
    for field in itunes_fields:
        print(f"  {field}: {parsed.feed.get(field)}")
    print()
    
    # Check raw XML parsing - feedparser might have it in a different location
    print("=== Checking FeedParser Namespaces ===")
    if hasattr(parsed.feed, 'itunes_author'):
        print(f"itunes_author (direct): {parsed.feed.itunes_author}")
    if hasattr(parsed, 'namespaces'):
        print(f"Namespaces: {parsed.namespaces}")
    print()
    
    # Test the OLD logic (what was wrong)
    old_author = parsed.feed.get("author") or parsed.feed.get("itunes_author")
    print(f"OLD logic result: {old_author}")
    
    # Test the NEW logic (extract from XML like the fixed code does)
    import re
    itunes_author_from_xml = None
    try:
        itunes_author_match = re.search(
            rb'<itunes:author[^>]*>(.*?)</itunes:author>',
            content,
            re.IGNORECASE | re.DOTALL
        )
        if not itunes_author_match:
            itunes_author_match = re.search(
                rb'<itunes_author[^>]*>(.*?)</itunes_author>',
                content,
                re.IGNORECASE | re.DOTALL
            )
        if itunes_author_match:
            itunes_author_from_xml = itunes_author_match.group(1).decode('utf-8').strip()
    except Exception:
        pass
    
    new_author = itunes_author_from_xml or parsed.feed.get("itunes_author") or parsed.feed.get("author")
    print(f"NEW logic result (XML extraction): {itunes_author_from_xml}")
    print(f"NEW logic final result: {new_author}")
    print()
    
    # Verification
    expected_author = "Ruth Lamb"
    if new_author == expected_author:
        print(f"✅ SUCCESS! Author correctly extracted as '{new_author}'")
    else:
        print(f"⚠️  WARNING: Expected '{expected_author}', got '{new_author}'")
    
    print("\n=== All Feed Fields ===")
    print("Available fields in parsed.feed:")
    for key in sorted(parsed.feed.keys()):
        value = parsed.feed.get(key)
        if isinstance(value, str) and len(value) < 100:
            print(f"  {key}: {value}")
        else:
            print(f"  {key}: {type(value).__name__}")

if __name__ == "__main__":
    test_author_extraction()

