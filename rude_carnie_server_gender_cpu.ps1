$host.ui.RawUI.WindowTitle = "gender - rude carnie server"
conda env create -f tensorflow-cpu.yaml
activate tensorflow-cpu
cd ~\src\rude-carnie
mkdir C:\TEMP
Start-Process -NoNewWindow -FilePath python -ArgumentList "guess_server.py --device_id /cpu:0 --class_type gender --model_type inception --model_dir checkpoints\gender\inception\21936\ --port 5100 --work_dir C:\TEMP"
Start-Process -NoNewWindow -FilePath python -ArgumentList "guess_server.py --device_id /cpu:1 --class_type gender --model_type inception --model_dir checkpoints\gender\inception\21936\ --port 5101 --work_dir C:\TEMP"
#Start-Process -NoNewWindow -FilePath python -ArgumentList "guess_server.py --device_id /cpu:2 --class_type gender --model_type inception --model_dir checkpoints\gender\inception\21936\ --port 5102 --work_dir C:\TEMP"
#Start-Process -NoNewWindow -FilePath python -ArgumentList "guess_server.py --device_id /cpu:3 --class_type gender --model_type inception --model_dir checkpoints\gender\inception\21936\ --port 5103 --work_dir C:\TEMP"
#Start-Process -NoNewWindow -FilePath python -ArgumentList "guess_server.py --device_id /cpu:4 --class_type gender --model_type inception --model_dir checkpoints\gender\inception\21936\ --port 5104 --work_dir C:\TEMP"
#Start-Process -NoNewWindow -FilePath python -ArgumentList "guess_server.py --device_id /cpu:5 --class_type gender --model_type inception --model_dir checkpoints\gender\inception\21936\ --port 5105 --work_dir C:\TEMP"