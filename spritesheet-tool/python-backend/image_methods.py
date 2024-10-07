import asyncio
import base64
from io import BytesIO
from typing import Dict

from fastapi import Form, UploadFile
import numpy as np
from PIL import Image


async def decode_image(file: UploadFile):
    image = Image.open(BytesIO(await file.read()))
    image = image.convert("RGBA")
    return np.array(image)


def encode_image(array):
    buffer = BytesIO()
    image = Image.fromarray(array)
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


# async def command_set_image(file: UploadFile) -> bool:
#     return await ImageHolder.set_image(file)


async def command_remove_background(
        file: UploadFile,
        color: str = Form("#FFFFFF"),
        feather: str = Form("0")):
    im = await decode_image(file)
    rgb = np.asarray([int(color[i:i + 2], 16) for i in (1, 3, 5)])
    feather = int(feather)

    background_mask = abs(im[..., :3] - rgb) <= feather
    background_mask = background_mask.all(axis=2)
    im[background_mask, :] = 0

    return encode_image(im)


async def command_set_padding(file: UploadFile, padding: Dict[str, int]):
    im = await decode_image(file)

    w_pad = (int(padding["left"]), int(padding["right"]))
    h_pad = (int(padding["up"]), int(padding["down"]))
    im = np.pad(im, (h_pad, w_pad, (0, 0)), mode="edge")

    return encode_image(im)
