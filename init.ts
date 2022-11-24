#! /usr/bin/env node
import { Command } from 'commander'
import colors from 'colors'
import path from 'path'
import { prompt } from 'enquirer'
import fs from 'fs'
import { execSync } from 'child_process'

const PACKAGE_MANAGERS = {
  npm: (prefix: string) => `npm install --prefix ${prefix} -D @columnapp/schema typescript @types/node`,
  yarn: (prefix: string) => `cd ${prefix} && yarn add --dev @columnapp/schema typescript @types/node`, // not sure why cwd wouldnt work
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
  type: 'string',
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
  .version('0.0.1')
  .option('-p, --path <path>', 'directory path to create the column')
  .action(async (options: Options) => {
    function optionPath(p: string) {
      return options.path == null ? p : path.join(options.path, p)
    }
    console.log(
      colors.cyan(
        `Welcome, we are going to bootstrap a barebone column for column.app in ${
          options.path == null ? 'the current directory' : options.path
        }`,
      ),
    )
    // ensure opts.path exist
    if (options.path != null && !fs.existsSync(options.path)) {
      fs.mkdirSync(options.path)
    }
    const tsConfigPath = optionPath('tsconfig.json')
    const indexTsPath = optionPath('index.ts')
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
      if (fs.existsSync(indexTsPath)) {
        const response = (await prompt({
          type: 'confirm',
          name: 'writeIndex',
          message: 'index.ts already exists, overwrite?:',
        })) as { writeIndex: boolean }
        writeIndex = response.writeIndex
      }
      let writeTsconfig = true
      if (fs.existsSync(tsConfigPath)) {
        const response = (await prompt({
          type: 'confirm',
          name: 'writeTsconfig',
          message: 'tsconfig.json already exists, overwrite?:',
        })) as { writeTsconfig: boolean }
        writeTsconfig = response.writeTsconfig
      }
      if (writeIndex) {
        writeIndexTSFile(indexTsPath, responseName.name)
        console.log(colors.green(`index.ts is created`))
      }
      if (writeTsconfig) {
        writeTSConfigFile(tsConfigPath)
        console.log(colors.green(`tsconfig.json is created`))
      }
      console.log(colors.cyan('Installing the necessary packages...'))
      execSync(PACKAGE_MANAGERS[responsePackage.packageManager](options.path ?? '.'))
      console.log(colors.green('Done! Open index.ts to start building your column, happy coding :)'))
    } catch (e) {
      console.log(colors.green('Cancelled'))
    }
  })

program.parse()
