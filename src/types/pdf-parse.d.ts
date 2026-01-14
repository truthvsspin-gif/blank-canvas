declare module "pdf-parse" {
  const pdfParse: (input: Buffer | Uint8Array) => Promise<{ text: string }>
  export default pdfParse
}
