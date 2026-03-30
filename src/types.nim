import std/[json, strutils]

type
  Variable* = object
    typeName*: string
    defaultValue*: JsonNode
    isConst*: bool
    sync*: bool
    optional*: bool

const
  scalarTypes* = ["boolean", "int", "float", "string", "object"]
  fixedTypes* = ["null", "Content"]

proc knownTypes*(): seq[string] =
  result = @[]
  for base in scalarTypes:
    result.add(base)
    result.add(base & "[]")
  for t in fixedTypes:
    result.add(t)

proc isKnownType*(candidate: string): bool =
  let trimmed = candidate.strip()
  for t in knownTypes():
    if t == trimmed:
      return true
  return false

proc variableToJson*(value: Variable): JsonNode =
  %*{
    "type": value.typeName,
    "default": value.defaultValue,
    "const": value.isConst,
    "sync": value.sync,
    "optional": value.optional,
  }
