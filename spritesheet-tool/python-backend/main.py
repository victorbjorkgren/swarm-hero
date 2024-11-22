import json

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from image_methods import command_remove_background, command_set_padding, command_resize

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# @app.post("/set-image/")
# async def set_image(file: UploadFile = File(...)):
#     try:
#         image_shape = await command_set_image(file)
#         return JSONResponse(content={"message": f"Received image of shape {image_shape}"}, status_code=200)
#     except Exception as e:
#         return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/remove-background/")
async def remove_background(
        file: UploadFile = File(...),
        color: str = Form("#FFFFFF"),
        feather: str = Form("0")
):
    print(f'Background endpoint trigger')
    try:
        image = await command_remove_background(file, color, feather)
        return JSONResponse(content={"image": image})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/set-padding/")
async def set_padding(file: UploadFile = File(...), padding: str = Form("{}")):
    print(f'Padding endpoint trigger')
    try:
        padding_obj = json.loads(padding)
        print(padding_obj)
        image = await command_set_padding(file, padding_obj)
        return JSONResponse(content={"image": image})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/resize/")
async def resize(file: UploadFile = File(...), scale: str = Form("1")):
    print(f'Resize endpoint trigger')
    try:
        image = await command_resize(file, scale)
        return JSONResponse(content={"image": image})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    print('Starting dev server')
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
