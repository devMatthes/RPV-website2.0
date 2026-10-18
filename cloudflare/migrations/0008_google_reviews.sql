-- Only a permanent Place ID is stored, never Google reviews, authors, ratings or photos.
CREATE TABLE google_review_place (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  place_id TEXT NOT NULL CHECK (length(place_id) BETWEEN 1 AND 255)
) STRICT;
