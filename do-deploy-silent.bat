@echo off
set "NODEJS=C:\Program Files\nodejs"
set "PATH=%NODEJS%;%PATH%"
cd /d "C:\Users\MY PC\Desktop\chaye-cafe-pos"
echo Deploying to Firebase... > deploy-log.txt
call "%USERPROFILE%\AppData\Roaming\npm\firebase.cmd" deploy --only hosting >> deploy-log.txt 2>&1
echo EXIT:%ERRORLEVEL% >> deploy-log.txt
