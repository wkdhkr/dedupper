$host.ui.RawUI.WindowTitle = "open nsfw server"
conda env create -f tensorflow.yaml
activate tensorflow
cd ~\src\tensorflow-open_nsfw
python classify_cv2_nsfw.py -m data\open_nsfw-weights.npy