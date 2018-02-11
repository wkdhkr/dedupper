# Dedupper

Importing a lot of files while eliminating duplication.

## key features

* duplicated image detection(p-hash, d-hash, imageMagick signature)
* SQLite integration(Even if you delete a file, the hash will not be lost from SQLite DB.)
* Examine files that are suspected of duplication.
* nsfw image filtering by [Open nsfw model](https://github.com/yahoo/open_nsfw)
* suggest same image of higher quality

## Requirements

### dedupper

* Windows 10 x64
* Node.js 8.9.x or higher

### phash

* python 2.7
* Microsoft Visual C++ Build Tools 2015
  * `choco install visualcppbuildtools`

### Open nsfw model

* Miniconda
  * python 3.6 with Tensorflow 1.5
    * `conda create -n tensorflow python=3.6 anaconda`
* Cuda 9.0
  * [CUDA Toolkit 9.0 Downloads | NVIDIA Developer](https://developer.nvidia.com/cuda-90-download-archive?target_os=Windows&target_arch=x86_64&target_version=10&target_type=exenetwork)
    * copy `bin/ include/ lib/` folder to `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v9.0`
* [tensorflow-open_nsfw](https://github.com/wkdhkr/tensorflow-open_nsfw)
  * OpenCV
    * `conda install -c anaconda html5lib`
      * prevent opencv installation issue.
    * `pip install opencv-python`
  * clone repository, execute following command in `activate tensorflow` environemnt.
    * `python classify_cv2_nsfw.py -m data\open_nsfw-weights.npy`
