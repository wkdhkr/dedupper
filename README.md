# Dedupper

Importing a lot of files while eliminating duplication. Currently, this application focuses on image files. Even video files can be used as it is (file hash only).

## key features

* duplicated image detection(p-hash, d-hash, imageMagick signature)
* SQLite integration(Even if you delete a file, the hash will not be lost from SQLite DB.)
* Examine files that are suspected of duplication.
* nsfw image filtering by [Open nsfw model](https://github.com/yahoo/open_nsfw)
* face of gender/age image filtering by [rude-carnie](https://github.com/dpressel/rude-carnie)
* suggest same image of higher quality

## Setup

### dedupper

* Windows 10 x64
* Node.js 8.9.x or higher

**NOTE:** activate command is not work in Powershell. try `conda install -n root -c pscondaenvs pscondaenvs`.

```bash
choco install visualcppbuildtools
choco install miniconda3
git clone https://github.com/wkdhkr/dedupper.git
cd dedupper
conda create -n py2 python=2.7
activate py2
npm install
npm run build
npm link
deactivate
```

### Deep learning

#### Cuda, cuDNN

If you use tensorflow-gpu, following is required. but it seems unstable yet.

* Cuda 9.0
  * [CUDA Toolkit 9.0 Downloads | NVIDIA Developer](https://developer.nvidia.com/cuda-90-download-archive?target_os=Windows&target_arch=x86_64&target_version=10&target_type=exenetwork)
  * copy `bin/ include/ lib/` folder to `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v9.0`
* [cuDNN Download | NVIDIA Developer](https://developer.nvidia.com/rdp/cudnn-download)(if you use tensorflow-gpu)

#### Python 3

You can choose either tensorflow or tensorflow-cpu.(recommend: tensorflow. use cpu.)

**NOTE:** Just install miniconda when using yaml file. pip/conda install is not needed.

manual install version.

* Miniconda with Python 3.6
  * Tensorflow 1.5(GPU)
    * `conda create -n tensorflow python=3.6 anaconda`
    * `acvitate tensorflow`
    * `pip install tensorflow-gpu`
  * Tensorflow 1.5(CPU)
    * `conda create -n tensorflow-cpu python=3.6 anaconda`
    * `acvitate tensorflow-cpu`
    * `pip install tensorflow`
  * OpenCV(in activated environment)
    * `conda install -c anaconda html5lib`
      * prevent opencv installation issue.
    * `pip install opencv-python`
  * dlib(in activated environment)
    * `conda install -c conda-forge dlib=19.4`

yaml install version.

```bash
choco install miniconda3
conda env create -f tensorflow-cpu.yaml
conda env create -f tensorflow.yaml
```

#### ruda-carnie, open_nsfw

use [cmder](http://cmder.net/) for this setup. you can install it by `choco install cmder -y`.

first, setup rude-carnie.

```bash
cd
mkdir src
cd src
git clone https://github.com/wkdhkr/rude-carnie.git`
cd rude-carnie
wget http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
bunzip2 shape_predictor_68_face_landmarks.dat.bz2
```

* download Pre-trained checkpoint
  * age
    * https://drive.google.com/drive/folders/0B8N1oYmGLVGWbDZ4Y21GLWxtV1E
  * gender
    * https://drive.google.com/drive/folders/0B8N1oYmGLVGWemZQd3JMOEZvdGs

setup checkpoints folder.

```tree
checkpoints/
├── age
│   └── inception
│       └── 22801
│           ├── checkpoint
│           ├── checkpoint-14999.data-00000-of-00001
│           ├── checkpoint-14999.index
│           └── checkpoint-14999.meta
└── gender
    └── inception
        └── 21936
            ├── checkpoint
            ├── checkpoint-14999.data-00000-of-00001
            ├── checkpoint-14999.index
            └── checkpoint-14999.meta
```

next, setup open_nsfw.

```bash
cd
cd src
git clone https://github.com/wkdhkr/tensorflow-open_nsfw.git
```

that it! start following ps1 script files.

* cpu
  * [rude_carnie_server_age_cpu.ps1](rude_carnie_server_age_cpu.ps1)
  * [rude_carnie_server_gender_cpu.ps1](rude_carnie_server_gender_cpu.ps1)
  * [open_nsfw_server_cpu.ps1](open_nsfw_server_cpu.ps1)
* gpu
  * [rude_carnie_server_age.ps1](rude_carnie_server_age.ps1)
  * [rude_carnie_server_gender.ps1](rude_carnie_server_gender.ps1)
  * [open_nsfw_server.ps1](open_nsfw_server.ps1)
