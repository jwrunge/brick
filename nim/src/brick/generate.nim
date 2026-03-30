import std/[json, os, strutils]


const defaultHtml = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{%APP.name%}</title>
  </head>
  <body>
    {%CONTENT%}
  </body>
</html>
"""


proc ensurePaths(relativeDir: string, output: string): string =
  let dist = relativeDir / "dist"
  let distOutput = dist / output

  createDir(dist)
  createDir(distOutput)

  return distOutput


proc generateWeb(relativeDir: string, appSchema: JsonNode) =
  stdout.writeLine("Generating web project " & relativeDir)

  let distOutput = ensurePaths(relativeDir, "web")
  let appName = appSchema{"name"}.getStr()
  let appVersion = appSchema{"version"}.getStr("0.0.0")
  let appBuild = if appSchema.hasKey("build"): $appSchema{"build"}.getInt() else: "0"

  let htmlContent = defaultHtml
    .replace("{%APP.name%}", appName)
    .replace(
      "{%CONTENT%}",
      "<h1>" & appName & "</h1><p>Version: " & appVersion & " (build " & appBuild & ")</p>",
    )

  writeFile(distOutput / "index.html", htmlContent)


proc generate*(output: string, dir: string) =
  let relativeDir = absolutePath(dir)
  let appPath = relativeDir / "app.json"

  if not fileExists(appPath):
    raise newException(IOError, "Error reading app.json in " & dir & ": file does not exist")

  var appSchema: JsonNode
  try:
    appSchema = parseJson(readFile(appPath))
  except CatchableError as err:
    raise newException(IOError, "Error reading app.json in " & dir & ": " & err.msg)

  case output
  of "web":
    generateWeb(relativeDir, appSchema)
  else:
    raise newException(ValueError, "Output type " & output & " not supported.")
