version       = "0.1.0"
author        = "Jacob Runge"
description   = "Nim CLI prototype for Brick"
license       = "ISC"
srcDir        = "src"
bin           = @["brick"]

requires "nim >= 2.0.0"

proc buildBrick() =
  exec "mkdir -p dist"
  exec "nim c -o:dist/brick src/main.nim"

task b, "Build the brick binary to dist/brick":
  buildBrick()

task parse, "Run the parse function in the Nim binary":
  buildBrick()
  exec "./dist/brick parse ./demo/components/Layout.ctr"
  exec "./dist/brick parse ./demo/components/Main.ctr"

task web, "Run the generate web function in the Nim binary":
  buildBrick()
  exec "./dist/brick generate web ./demo"