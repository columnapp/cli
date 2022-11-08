#! /usr/bin/env node
import { Command } from 'commander'
import colors from 'colors'
import path from 'path'
import { prompt } from 'enquirer'
import fs from 'fs'
import { execSync } from 'child_process'

const PACKAGE_MANAGERS = {
  npm: (prefix: string) => `npm install --prefix ${prefix} -D @columnapp/schema typescript`,
  yarn: (prefix: string) => `cd ${prefix} && yarn add --dev @columnapp/schema typescript`, // not sure why cwd wouldnt work
} as const
/**
 * generated the index.ts file
 */
function writeIndexTSFile(filePath: string, name: string) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath)
  }
  fs.writeFileSync(
    filePath,
    `import { ColumnSchemaString } from '@columnapp/schema'

const column: ColumnSchemaString = {
  name: 'Shooting Stars',
  version: 'string.0.0.1',
  info: 'example string column',
}

export default { column }`,
  )
}
function writeTSConfigFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath)
  }
  fs.writeFileSync(
    filePath,
    `{
  "$schema": "https://json.schemastore.org/tsconfig",
  "exclude": ["node_modules", "dist"],
  "display": "Default",
  "compilerOptions": {
    "baseUrl": "./",
    "composite": false,
    "stripInternal": true,
    "lib": ["es2020"],
    "disableSizeLimit": true,
    "incremental": true,
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "inlineSources": false,
    "isolatedModules": true,
    "moduleResolution": "node",
    "skipLibCheck": true,
    "strict": true
  }
}`,
  )
}

type Options = {
  path?: string
}
const program = new Command()
program
  .version('0.1.0')
  .option('-p, --path <path>', 'directory path to create the column')
  .action(async (options: Options) => {
    console.log(colors.cyan(`Welcome, we are going to publish your column to column.app`))
  })

program.parse()
