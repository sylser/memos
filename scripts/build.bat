cd web
npm run release
cd ../cmd/memos
SET GOOS=linux
SET GOARCH=amd64
go build -o memos