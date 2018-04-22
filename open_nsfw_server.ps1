$host.ui.RawUI.WindowTitle = "open nsfw server"
conda env create -f tensorflow.yaml
activate tensorflow
cd ~\src\tensorflow-open_nsfw
Start-Process -NoNewWindow -FilePath python -ArgumentList "classify_cv2_nsfw.py -p 6000 -m data\open_nsfw-weights.npy"
Start-Process -NoNewWindow -FilePath python -ArgumentList "classify_cv2_nsfw.py -p 6001 -m data\open_nsfw-weights.npy"
Start-Process -NoNewWindow -FilePath python -ArgumentList "classify_cv2_nsfw.py -p 6002 -m data\open_nsfw-weights.npy"
Start-Process -NoNewWindow -FilePath python -ArgumentList "classify_cv2_nsfw.py -p 6003 -m data\open_nsfw-weights.npy"
Start-Process -NoNewWindow -FilePath python -ArgumentList "classify_cv2_nsfw.py -p 6004 -m data\open_nsfw-weights.npy"
Start-Process -NoNewWindow -FilePath python -ArgumentList "classify_cv2_nsfw.py -p 6005 -m data\open_nsfw-weights.npy"