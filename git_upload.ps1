$git = "C:\Program Files\Git\cmd\git.exe"
& $git config --global user.name "SAS_Agricolas"
& $git config --global user.email "admin@sas.com"
& $git init
& $git branch -M main
& $git add .
& $git commit -m "Initial commit of SAS Agricolas system"
# Check if remote exists
$remoteExists = & $git remote get-url origin 2>$null
if ($remoteExists) {
    & $git remote set-url origin https://github.com/mylivetkt-byte/cultivos.git
} else {
    & $git remote add origin https://github.com/mylivetkt-byte/cultivos.git
}
& $git push -u origin main
