import "dotenv/config"
import path from "path"
import { defineConfig } from "prisma/config"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaNeon } from "@prisma/adapter-neon"
import Database from "better-sqlite3"

const url = process.env["DATABASE_URL"] || "file:./dev.db"

function getAdapter() {
  if (url.startsWith("file:")) {
    const filePath = url.replace("file:", "")
    const resolved = path.resolve(process.cwd(), filePath.startsWith("./") ? filePath.slice(2) : filePath)
    const sqlite = new Database(resolved)
    return new PrismaBetterSqlite3(sqlite)
  }
  return new PrismaNeon({ connectionString: url })
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
  adapter: getAdapter(),
})
