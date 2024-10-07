import asyncio
import base64
from io import BytesIO

import numpy as np
from PIL import Image
from fastapi import UploadFile


class ImageHolder:
    _non_cropped_image: np.ndarray = None
    _image: np.ndarray = None
    lock = asyncio.Lock()

    @staticmethod
    async def decode_image(file: UploadFile):
        image = Image.open(BytesIO(await file.read()))
        image = image.convert("RGBA")
        return np.array(image)

    @classmethod
    def set_image(cls, image: np.ndarray):
        cls._image = image.copy()
        return cls._image.shape

    @classmethod
    def set_non_cropped_image(cls, image: np.ndarray):
        cls._non_cropped_image = image.copy()
        return cls._non_cropped_image.shape

    @classmethod
    def get_image(cls):
        if cls._image is None:
            raise RuntimeError("ImageHolder image has not been set yet.")
        return cls._image.copy()

    @classmethod
    def get_non_cropped_image(cls):
        if cls._non_cropped_image is None:
            raise RuntimeError("ImageHolder image has not been set yet.")
        return cls._non_cropped_image.copy()

    @classmethod
    def encode(cls, array):
        image = Image.fromarray(array)
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode()
