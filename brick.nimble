version       = "0.1.0"
author        = "Jacob Runge"
description   = "Nim CLI prototype for Brick"
license       = "ISC"
srcDir        = "src"
bin           = @["brick"]

requires "nim >= 2.0.0"

task b, "Build the brick binary to dist/brick":
  exec "mkdir -p dist"
  exec "nim c -o:dist/brick src/main.nim"

task parse, "Run the parse function in the Nim binary":
  exec "nim c -r src/main.nim -- parse ./demo/components/Layout.ctr"
  exec "nim c -r src/main.nim -- parse ./demo/components/Main.ctr"

task web, "Run the generate web function in the Nim binary":
  exec "nim c -r src/main.nim -- generate web ./demo"