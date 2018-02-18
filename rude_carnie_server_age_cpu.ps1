$host.ui.RawUI.WindowTitle = "age - rude carnie server"
conda env create -f tensorflow-cpu.yaml
activate tensorflow-cpu
cd ~\src\rude-carnie
mkdir C:\TEMP
python guess_server.py --class_type age --model_type inception --model_dir checkpoints\age\inception\22801\ --port 5002 --work_dir C:\TEMP