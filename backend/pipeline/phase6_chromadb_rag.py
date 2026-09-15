import chromadb

# This creates a database folder on disk — it remembers data between runs
client = chromadb.PersistentClient(path="storage/chroma_data")

# "cosine" similarity space matches how we compare CLIP vectors elsewhere
collection = client.get_or_create_collection(
    name="screens",
    metadata={"hnsw:space": "cosine"}
)


def find_similar_screen(vector: list, threshold: float = 0.85):
    """
    Searches ChromaDB for a screen similar to the given vector.
    Returns stored screen data if a close match is found, otherwise None.
    """
    if collection.count() == 0:
        return None

    results = collection.query(
        query_embeddings=[vector],
        n_results=1
    )

    if not results['ids'][0]:
        return None

    distance = results['distances'][0][0]
    similarity = 1 - distance  # cosine space: similarity = 1 - distance

    if similarity >= threshold:
        metadata = results['metadatas'][0][0]
        return {
            "id": results['ids'][0][0],
            "label": metadata.get('label'),
            "screenshot_path": metadata.get('screenshot_path'),
            "similarity": round(similarity, 3)
        }

    return None


def store_screen(vector: list, label: str, screenshot_path: str):
    """
    Saves a new screen's vector + label into ChromaDB so it can be
    recognized next time a similar screen appears.
    """
    screen_id = f"screen_{collection.count() + 1}"

    collection.add(
        ids=[screen_id],
        embeddings=[vector],
        metadatas=[{"label": label, "screenshot_path": screenshot_path}]
    )

    return screen_id


if __name__ == "__main__":
    # Quick manual test
    from phase4_clip_encoder import get_image_vector

    vec = get_image_vector("storage/screenshots/screen_test.png")

    existing = find_similar_screen(vec)
    if existing:
        print(f"Found similar screen: {existing}")
    else:
        new_id = store_screen(vec, "Test Screen", "storage/screenshots/screen_test.png")
        print(f"Stored new screen: {new_id}")