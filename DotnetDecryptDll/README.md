build dev : dotnet run 
build prod: dotnet publish -r osx-arm64 -c Release /p:PublishSingleFile=true /p:SelfContained=true
