#! /usr/bin/env node
import { ColumnSchema } from '@columnapp/schema'
import { execSync } from 'child_process'
import colors from 'colors'
import { Command } from 'commander'
import { prompt } from 'enquirer'
import fs from 'fs'
import path from 'path'

const PACKAGE_MANAGERS = {
  npm: (prefix: string) => `npm install --prefix ${prefix} -D @columnapp/schema typescript @types/node`,
  yarn: (prefix: string) => `cd ${prefix} && yarn add --dev @columnapp/schema typescript @types/node`,
  pnpm: (prefix: string) => `cd ${prefix} && pnpm add -D @columnapp/schema typescript @types/node`,
} as const
/**
 * generated the index.ts file
 */
function writeIndexTSFile(filePath: string, name: string, type: string, imports: string) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath)
  }
  fs.writeFileSync(
    filePath,
    `import { ${imports} } from '@columnapp/schema'

const column: ${imports} = {
  name: '${name}',
  type: '${type}',
  info: 'example string column',
}

export default column`,
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

const TypeMap: {
  [type in typeof ColumnSchema._input.type]: {
    imports: string
  }
} = {
  boolean: {
    imports: 'ColumnSchemaBoolean',
  },
  'boolean[]': {
    imports: 'ColumnSchemaBooleans',
  },
  date: {
    imports: 'ColumnSchemaDate',
  },
  'date[]': {
    imports: 'ColumnSchemaDates',
  },
  number: {
    imports: 'ColumnSchemaNumber',
  },
  'number[]': {
    imports: 'ColumnSchemaNumbers',
  },
  string: { imports: 'ColumnSchemaString' },
  'string[]': { imports: 'ColumnSchemaStrings' },
}

export async function init(program: Command) {
  program
    .command('init')
    .option('-p, --path <path>', 'directory path to create the column')
    .action(async (options: Options) => {
      function optionPath(p: string) {
        return options.path == null ? p : path.join(options.path, p)
      }
      console.log(
        colors.cyan(
          `Welcome, we are going to bootstrap a barebone column for column.app in ${colors.underline(
            options.path == null ? 'the current directory' : options.path,
          )}`,
        ),
      )
      // ensure opts.path exist
      if (options.path != null && !fs.existsSync(options.path)) {
        fs.mkdirSync(options.path)
      }
      const tsConfigPath = optionPath('tsconfig.json')
      const indexTsPath = optionPath('index.ts')
      try {
        const responseName = (await prompt({
          type: 'input',
          name: 'value',
          message: 'column name:',
          required: true,
        })) as { value: string }

        const responseType = (await prompt({
          type: 'select',
          name: 'value',
          choices: Object.keys(TypeMap).map((type) => ({ name: type, value: type })),
          message: 'column type:',
          required: true,
        })) as { value: keyof typeof TypeMap }

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
          writeIndexTSFile(indexTsPath, responseName.value, responseType.value, TypeMap[responseType.value].imports)
          console.log(colors.green(`index.ts is created`))
        }
        if (writeTsconfig) {
          writeTSConfigFile(tsConfigPath)
          console.log(colors.green(`tsconfig.json is created`))
        }
        console.log(colors.cyan('Installing the necessary packages...'))
        execSync(PACKAGE_MANAGERS[responsePackage.packageManager]('.'))
        console.log(
          colors.green(`Done! Open ${colors.underline('index.ts')} to start building your column, happy coding :)`),
        )
      } catch (e) {
        console.log(colors.green('Cancelled'))
      }
    })
}
