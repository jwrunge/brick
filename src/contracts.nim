import std/[algorithm, json, math, sequtils, strutils, tables]
import ./types

proc fail(message: string) {.noreturn.} =
  raise newException(ValueError, message)

proc countChar(input: string, needle: char): int =
  for ch in input:
    if ch == needle:
      inc result

proc isValidVariableName(name: string): bool =
  if name.len == 0:
    return false

  let first = name[0]
  if not (first.isAlphaAscii() or first in {'_', '$'}):
    return false

  for ch in name[1 .. ^1]:
    if not (ch.isAlphaNumeric() or ch in {'_', '$'}):
      return false

  return true

proc isValidConstName(name: string): bool =
  if name.len == 0:
    return false
  for ch in name:
    if not (ch in {'A' .. 'Z'} or ch == '_'):
      return false
  return true

proc removeComments(input: string): string =
  var i = 0
  var inLineComment = false
  var inBlockComment = false

  while i < input.len:
    if inLineComment:
      if input[i] == '\n':
        inLineComment = false
        result.add('\n')
      inc i
      continue

    if inBlockComment:
      if i + 1 < input.len and input[i] == '*' and input[i + 1] == '/':
        inBlockComment = false
        i += 2
      else:
        inc i
      continue

    if i + 1 < input.len and input[i] == '/' and input[i + 1] == '/':
      inLineComment = true
      i += 2
      continue

    if i + 1 < input.len and input[i] == '/' and input[i + 1] == '*':
      inBlockComment = true
      i += 2
      continue

    result.add(input[i])
    inc i

proc extractContractSection(markup: string): string =
  let marker = "[Contract]"
  let startMarker = markup.find(marker)
  if startMarker < 0:
    return ""

  let contentStart = startMarker + marker.len
  let remaining = markup[contentStart .. ^1]
  let nextSectionRel = remaining.find("\n[")

  if nextSectionRel < 0:
    result = remaining
  else:
    result = remaining[0 ..< nextSectionRel]

  result = removeComments(result).strip()

proc removeTrailingArrayBrackets(input: string): string =
  let trimmed = input.strip()
  if trimmed.len < 2 or trimmed[^1] != ']':
    return input

  var idx = trimmed.len - 2
  while idx >= 0 and trimmed[idx].isSpaceAscii():
    dec idx

  if idx >= 0 and trimmed[idx] == '[':
    return trimmed[0 ..< idx].strip()

  return input

proc validateStructuredType(value: JsonNode, path: string) =
  case value.kind
  of JString:
    if not isKnownType(value.getStr()):
      fail("Invalid type annotation for property '" & path & "': " & value.getStr())
  of JArray:
    if value.len != 1:
      fail(
        "Array type annotation for property '" & path & "' must have exactly one item schema"
      )
    validateStructuredType(value[0], path & "[]")
  of JObject:
    for key, child in value:
      validateStructuredType(child, path & "." & key)
  else:
    fail(
      "Type annotation for property '" &
        path &
        "' must be a string, object, or single-schema array"
    )

proc validateTypeAnnotation(typeText: string): string =
  let trimmed = typeText.strip()

  if trimmed.startsWith("{"):
    let jsonCandidate = removeTrailingArrayBrackets(trimmed)
    var parsed: JsonNode
    try:
      parsed = parseJson(jsonCandidate)
    except CatchableError:
      fail("Invalid object type annotation JSON: " & trimmed)

    validateStructuredType(parsed, "$root")
    return trimmed

  if isKnownType(trimmed):
    return trimmed

  fail("Invalid type annotation: " & trimmed)

proc determineTypeFromValue(value: string): tuple[varType: string, parsed: JsonNode] =
  let trimmed = value.strip()

  if trimmed.startsWith("{") and trimmed.endsWith("}"):
    return ("object", %value)

  if trimmed == "true" or trimmed == "false":
    return ("boolean", % (trimmed == "true"))

  if trimmed == "null":
    return ("null", newJNull())

  try:
    let number = parseFloat(trimmed)
    if abs(number - number.round()) < 1e-9:
      return ("int", % int(number))
    return ("float", % number)
  except ValueError:
    discard

  return ("string", %value)

proc splitTypeAndDefault(remainder: string): tuple[typeChunk: string, defaultChunk: string] =
  let trimmed = remainder.strip()
  if trimmed.len == 0:
    return ("", "")

  if trimmed[0] == '=':
    let rightSide = trimmed[1 .. ^1].strip()
    if rightSide.len == 0:
      fail("Expected default value after '='")
    return ("", rightSide)

  if trimmed[0] == ':':
    var braceDepth = 0
    var eqIndex = -1

    for i in 1 ..< trimmed.len:
      case trimmed[i]
      of '{':
        inc braceDepth
      of '}':
        dec braceDepth
      of '=':
        if braceDepth == 0:
          eqIndex = i
          break
      else:
        discard

    if eqIndex >= 0:
      let declared = trimmed[1 ..< eqIndex].strip()
      let defaultValue = trimmed[eqIndex + 1 .. ^1].strip()
      if declared.len == 0:
        fail("Type annotation missing after ':'")
      if defaultValue.len == 0:
        fail("Expected default value after '='")
      return (declared, defaultValue)

    let declared = trimmed[1 .. ^1].strip()
    if declared.len == 0:
      fail("Type annotation missing after ':'")
    return (declared, "")

  fail("Unexpected token sequence in declaration: " & trimmed)

proc collectContractDeclarations(contractString: string): seq[string] =
  var current = ""
  var braceDepth = 0

  for rawLine in contractString.splitLines():
    let line = rawLine.strip()
    if line.len == 0:
      continue

    if current.len == 0:
      current = line
    else:
      current.add(" ")
      current.add(line)

    braceDepth += countChar(rawLine, '{') - countChar(rawLine, '}')

    if braceDepth <= 0:
      result.add(current.strip())
      current = ""
      braceDepth = 0

  if current.len > 0:
    fail("Unterminated object type/default in declaration: " & current)


proc variablesToJson*(variables: Table[string, Variable]): JsonNode =
  result = newJObject()
  var keys = toSeq(variables.keys())
  keys.sort(cmp[string])

  for key in keys:
    result[key] = variableToJson(variables[key])

proc parseContract*(markup: string): Table[string, Variable] =
  let contractString = extractContractSection(markup)
  if contractString.len == 0:
    return initTable[string, Variable]()

  let declarations = collectContractDeclarations(contractString)
  var variables = initTable[string, Variable]()

  for line in declarations:
    let parts = line.splitWhitespace()
    if parts.len < 2:
      fail("Invalid variable declaration: " & line)

    let initializer = parts[0]
    if initializer notin ["let", "syn", "const"]:
      fail("Invalid variable declaration: " & line)

    let nameTokenRaw = parts[1]
    let hasInlineColon = nameTokenRaw.endsWith(":")
    let name = nameTokenRaw.strip(chars = {'?', ':'})
    let isOptional = nameTokenRaw.contains("?")

    if not isValidVariableName(name):
      fail("Invalid variable name '" & name & "' in line: " & line)

    if initializer == "const" and not isValidConstName(name):
      fail("Constant variable name must be uppercase: " & name)

    let remainderStart = line.find(nameTokenRaw) + nameTokenRaw.len
    var remainder = if remainderStart < line.len: line[remainderStart .. ^1] else: ""
    if hasInlineColon:
      remainder = ":" & remainder.strip()
    let (declaredChunk, defaultChunk) = splitTypeAndDefault(remainder)

    var declaredType = ""
    var defaultValue = newJNull()

    if declaredChunk.len > 0:
      declaredType = validateTypeAnnotation(declaredChunk)

    if defaultChunk.len > 0:
      let inferred = determineTypeFromValue(defaultChunk)
      defaultValue = inferred.parsed
      if declaredType.len == 0:
        declaredType = inferred.varType

    if defaultChunk.len > 0:
      let inferredType = determineTypeFromValue(defaultChunk).varType
      if declaredType.len > 0 and inferredType != declaredType:
        fail(
          "Type mismatch for variable '" &
            name &
            "': declared as " &
            declaredType &
            " but default value is of type " &
            inferredType
        )

    if initializer == "const" and defaultValue.kind == JNull:
      fail("Constant variable '" & name & "' must have a default value.")

    if declaredType == "Content" and defaultValue.kind != JNull:
      fail("Variable '" & name & "' of type Content must not have a default value.")

    if declaredType.len == 0:
      fail("Type annotation or default value required for variable '" & name & "'")

    variables[name] = Variable(
      typeName: declaredType,
      defaultValue: defaultValue,
      isConst: initializer == "const",
      sync: initializer == "syn",
      optional: isOptional,
    )

  return variables
