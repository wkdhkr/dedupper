$host.ui.RawUI.WindowTitle = "age - rude carnie server"
conda env create -f tensorflow.yaml
activate tensorflow
cd ~\src\rude-carnie
mkdir C:\TEMP
Start-Process -NoNewWindow -FilePath python -ArgumentList "guess_server.py --device_id /cpu:0 --class_type age --model_type inception --model_dir checkpoints\age\inception\22801\ --port 5000 --work_dir C:\TEMP"
Start-Process -NoNewWindow -FilePath python -ArgumentList "guess_server.py --device_id /cpu:1 --class_type age --model_type inception --model_dir checkpoints\age\inception\22801\ --port 5001 --work_dir C:\TEMP"
Start-Process -NoNewWindow -FilePath python -ArgumentList "guess_server.py --device_id /cpu:2 --class_type age --model_type inception --model_dir checkpoints\age\inception\22801\ --port 5002 --work_dir C:\TEMP"
Start-Process -NoNewWindow -FilePath python -ArgumentList "guess_server.py --device_id /cpu:3 --class_type age --model_type inception --model_dir checkpoints\age\inception\22801\ --port 5003 --work_dir C:\TEMP"
Start-Process -NoNewWindow -FilePath python -ArgumentList "guess_server.py --device_id /cpu:4 --class_type age --model_type inception --model_dir checkpoints\age\inception\22801\ --port 5004 --work_dir C:\TEMP"
Start-Process -NoNewWindow -FilePath python -ArgumentList "guess_server.py --device_id /cpu:5 --class_type age --model_type inception --model_dir checkpoints\age\inception\22801\ --port 5005 --work_dir C:\TEMP"