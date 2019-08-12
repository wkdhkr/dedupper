$host.ui.RawUI.WindowTitle = "face spinner"
conda env create -f face_spinner.yaml
activate face-spinner
cd ~\src\pytorch-PCN
#cd ~\src\PCN-pytorch
Start-Process -NoNewWindow -FilePath python -ArgumentList "pipenv run python application.py --port 7000"
Start-Process -NoNewWindow -FilePath python -ArgumentList "pipenv run python application.py --port 7001"
Start-Process -NoNewWindow -FilePath python -ArgumentList "pipenv run python application.py --port 7002"
Start-Process -NoNewWindow -FilePath python -ArgumentList "pipenv run python application.py --port 7003"
Start-Process -NoNewWindow -FilePath python -ArgumentList "pipenv run python application.py --port 7005"