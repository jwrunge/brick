import std/[json, os]
import ./contracts
import ./generate

proc printUsage() =
  stdout.writeLine("Usage:")
  stdout.writeLine("  brick parse <file>")
  stdout.writeLine("  brick generate <output> <dir>")
  quit(0)

proc runParse(filePath: string) =
  if not fileExists(filePath):
    raise newException(IOError, "File not found: " & filePath)

  let markup = readFile(filePath)
  let parsed = parseContract(markup)
  stdout.writeLine(pretty(variablesToJson(parsed), 2))

proc runGenerate(output: string, targetDir: string) =
  generate(output, targetDir)

proc main() =
  let args = commandLineParams()
  if args.len == 0:
    printUsage()

  case args[0]
  of "parse":
    if args.len != 2:
      raise newException(ValueError, "parse expects 1 argument: <file>")
    runParse(args[1])
  of "generate":
    if args.len != 3:
      raise newException(ValueError, "generate expects 2 arguments: <output> <dir>")
    runGenerate(args[1], args[2])
  else:
    raise newException(ValueError, "Unknown command: " & args[0])

when isMainModule:
  try:
    main()
  except CatchableError as err:
    stderr.writeLine("Error: " & err.msg)
    quit(1)
