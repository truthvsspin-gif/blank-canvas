import { NextResponse } from "next/server"
import mammoth from "mammoth"
import pdfParse from "pdf-parse"
import { read, utils } from "xlsx"

import { ingestKnowledgeSource } from "@/services/knowledgeBaseService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getFileExtension(name: string) {
  const parts = name.split(".")
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ""
}

async function extractTextFromFile(file: File) {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const ext = getFileExtension(file.name)
  const content = buffer.toString("utf8")

  const stripMarkdown = (value: string) =>
    value
      .replace(/#{1,6}\s+/g, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .replace(/^\s*[-*+]\s+/gm, "")
      .trim()

  const parseCsv = (value: string) => {
    const lines = value.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length === 0) return ""

    const parseLine = (line: string) => {
      const result: string[] = []
      let current = ""
      let inQuotes = false
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i]
        const next = line[i + 1]
        if (char === '"') {
          if (inQuotes && next === '"') {
            current += '"'
            i += 1
          } else {
            inQuotes = !inQuotes
          }
        } else if (char == "," && !inQuotes) {
          result.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const headers = parseLine(lines[0])
    let text = `DATABASE TABLE
${"=".repeat(60)}

`
    text += `Columns: ${headers.join(" | ")}
${"-".repeat(60)}

`
    let rowCount = 0
    for (let i = 1; i < lines.length; i += 1) {
      if (!lines[i].trim()) continue
      const values = parseLine(lines[i])
      text += `Record ${rowCount + 1}:
`
      headers.forEach((header, idx) => {
        text += `  - ${header}: ${values[idx] ?? ""}
`
      })
      text += "\n"
      rowCount += 1
    }
    text += `${"-".repeat(60)}
Total Records: ${rowCount}
`
    return text
  }

  const parseJson = (value: string) => {
    try {
      const data = JSON.parse(value)
      if (Array.isArray(data)) {
        return data
          .map((item) =>
            typeof item === "object" ? JSON.stringify(item, null, 2) : String(item)
          )
          .join("\n\n")
      }
      if (typeof data === "object") {
        return JSON.stringify(data, null, 2)
      }
      return String(data)
    } catch {
      return value
    }
  }


  if (ext === "pdf") {
    const result = await pdfParse(buffer)
    return result.text || ""
  }
  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ""
  }
  if (ext === "txt") {
    return content
  }
  if (ext === "md" || ext === "markdown") {
    return stripMarkdown(content)
  }
  if (ext === "json") {
    return parseJson(content)
  }
  if (ext === "csv") {
    return parseCsv(content)
  }
  if (ext === "xlsx" || ext === "xls") {
    const workbook = read(buffer, { type: "buffer" })
    let text = `EXCEL WORKBOOK
${"=".repeat(60)}

`
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName]
      const rows = utils.sheet_to_json(worksheet, { header: 1 }) as Array<Array<unknown>>
      if (rows.length === 0) return
      const headers = (rows[0] || []).map((header) => String(header ?? ""))
      text += `Sheet: ${sheetName}
${"-".repeat(60)}
`
      text += `Columns: ${headers.join(" | ")}

`
      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i]
        if (!row || row.length === 0) continue
        text += `Record ${i}:
`
        headers.forEach((header, idx) => {
          const value = row[idx]
          text += `  - ${header}: ${value ?? ""}
`
        })
      text += "\n"
      }
      text += "\n"
    })
    return text
  }

  throw new Error("Unsupported document type. Use PDF, DOCX, TXT, MD, JSON, CSV, XLS, or XLSX.")
}


export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 })
  }

  const businessId = formData.get("businessId")
  const title = formData.get("title")
  const file = formData.get("file")

  if (typeof businessId !== "string" || !businessId.trim()) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 })
  }

  try {
    const text = await extractTextFromFile(file)
    const result = await ingestKnowledgeSource({
      businessId,
      sourceType: "document",
      sourceUri: file.name,
      title: typeof title === "string" && title.trim() ? title.trim() : file.name,
      rawText: text,
    })
    return NextResponse.json({ status: "ok", ...result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to ingest document."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
