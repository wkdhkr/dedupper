$host.ui.RawUI.WindowTitle = "open nsfw server"
conda env create -f tensorflow-cpu.yaml
activate tensorflow-cpu
cd ~\src\tensorflow-open_nsfw
python classify_cv2_nsfw.py -m data\open_nsfw-weights.npy