$host.ui.RawUI.WindowTitle = "gender - rude carnie server"
conda env create -f tensorflow.yaml
activate tensorflow
cd ~\src\rude-carnie
mkdir C:\TEMP
python guess_server.py --class_type gender --model_type inception --model_dir checkpoints\gender\inception\21936\ --port 5001 --work_dir C:\TEMP