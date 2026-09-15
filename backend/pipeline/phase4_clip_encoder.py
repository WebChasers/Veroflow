import open_clip
import torch
from PIL import Image

# Load the CLIP model once when this file is imported (not every function call)
model, _, preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='openai')
model.eval()

def get_image_vector(screenshot_path: str):
    """
    Converts a screenshot into a 512-number vector.
    Two similar-looking screenshots will have similar vectors.
    """
    
    image = Image.open(screenshot_path).convert("RGB")
    image_input = preprocess(image).unsqueeze(0)
    
    with torch.no_grad():
        image_features = model.encode_image(image_input)
    
    vector = image_features[0].tolist()
    return vector


if __name__ == "__main__":
    vector = get_image_vector("../storage/screenshots/screen_test.png")
    print(f"Vector length: {len(vector)}")   # should print 512
    print(f"First 5 numbers: {vector[:5]}")