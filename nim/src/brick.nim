import std/[json, os]
import brick/[contracts, generate]


proc usageError() {.noreturn.} =
  stderr.writeLine("Usage: brick <mode> [options]")
  stderr.writeLine("Modes:")
  stderr.writeLine("  parse <file>")
  stderr.writeLine("  generate <output> <dir>")
  quit(1)


when isMainModule:
  var args = commandLineParams()
  if args.len > 0 and args[0] == "--":
    args = args[1 .. ^1]

  if args.len < 1:
    usageError()

  let mode = args[0]

  try:
    case mode
    of "parse":
      if args.len < 2:
        usageError()

      let filePath = args[1]
      let contents = readFile(filePath)
      let variables = parseContract(contents)
      stdout.writeLine("Variable lines: " & pretty(variablesToJson(variables), 2))

    of "generate":
      if args.len < 3:
        usageError()

      let output = args[1]
      let dir = args[2]
      generate(output, dir)

    else:
      usageError()
  except CatchableError as err:
    stderr.writeLine(err.msg)
    quit(1)
