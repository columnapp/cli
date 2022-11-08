#! /usr/bin/env node
import { Command } from 'commander'
import colors from 'colors'

import { prompt } from 'enquirer'
import fs from 'fs'
import { execSync } from 'child_process'

const PACKAGE_MANAGERS = {
  npm: 'npm install --dev @columnapp/schema typescript',
  yarn: 'yarn add --dev @columnapp/schema typescript',
  pnpm: 'pnpm add -D @columnapp/schema typescript',
} as const
/**
 * generated the index.ts file
 */
function writeIndexTSFile() {
  if (fs.existsSync('./index.ts')) {
    fs.rmSync('./index.ts')
  }
  fs.writeFileSync(
    './index.ts',
    `
  import {ColumnSchemaString} from '@columnapp/schema'
  
  const column: ColumnSchemaString = {
      version: 'string.0.0.1',
      info: 'example string column',
  }
  export default column`,
  )
}
function writeTSConfigFile() {
  if (fs.existsSync('./tsconfig.json')) {
    fs.rmSync('./tsconfig.json')
  }
  fs.writeFileSync(
    './tsconfig.json',
    `
{
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
const program = new Command()
program.version('0.1.0').action(async () => {
  console.log(colors.cyan('Welcome, we are going to bootstrap a barebone column for column.app.'))
  try {
    const responseName: { name: string } = (await prompt({
      type: 'input',
      name: 'name',
      message: 'column name:',
      required: true,
    })) as { name: string }

    const responsePackage = (await prompt({
      type: 'select',
      name: 'packageManager',
      message: 'package manager:',
      required: true,
      initial: 0,
      choices: Object.keys(PACKAGE_MANAGERS).map((p) => ({ name: p, message: p, value: p })),
    })) as { packageManager: keyof typeof PACKAGE_MANAGERS }
    let writeIndex = true
    if (fs.existsSync('./index.ts')) {
      const response = (await prompt({
        type: 'confirm',
        name: 'writeIndex',
        message: 'index.ts already exists, overwrite?:',
      })) as { writeIndex: boolean }
      writeIndex = response.writeIndex
    }
    let writeTsconfig = true
    if (fs.existsSync('./tsconfig.json')) {
      const response = (await prompt({
        type: 'confirm',
        name: 'writeTsconfig',
        message: 'tsconfig.json already exists, overwrite?:',
      })) as { writeTsconfig: boolean }
      writeTsconfig = response.writeTsconfig
    }
    if (writeIndex) {
      writeIndexTSFile()
      console.log(colors.green(`index.ts is created`))
    }
    if (writeTsconfig) {
      writeTSConfigFile()
      console.log(colors.green(`tsconfig.json is created`))
    }
    execSync(`${PACKAGE_MANAGERS[responsePackage.packageManager]}`)
  } catch (e) {
    console.log(colors.green('Cancelled'))
  }
})

// // generate the package.json with @columnapp/schema
// if (fs.existsSync('./package.json')) {
//   console.warn('skip generating package.json')
// } else {
//   fs.writeFileSync(
//     './package.json',
//     `
// {
//     "name": "COLUMN_NAME",
//     "description": "COLUMN_DESCRIPTION",
//     "version": "1.0.0"
//     "devDependencies": {

//     }
// }
// `,
//   )
// }
program.parse()
