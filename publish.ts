#! /usr/bin/env node
require('dotenv').config()
import { ColumnSchema, ColumnSchemaCheck, ColumnSchemaError } from '@columnapp/schema'
import axios from 'axios'
import colors from 'colors'
import { Command } from 'commander'
import esbuild, { BuildOptions } from 'esbuild'
import { existsSync, unlinkSync } from 'fs'
import { readFile } from 'fs/promises'
import os from 'os'
import path from 'path'
import { exit } from 'process'
type Options = {
  path?: string
  file: string
  show?: boolean
}
const domain = process.env.DOMAIN ?? 'https://column.app/'
const program = new Command()
program
  .version('0.1.0')
  .argument('[key]', `publish key, generate one at ${domain}publish`)
  .option('-p, --path <path>', 'path to the column directory, where package.json is at the root')
  .option('-s, --show', 'show the code')
  .option(
    'f, --file <filename>',
    'file name without extension that exports the column schema, defaults to "column"',
    'column',
  )
  .action(async (key: string | null, options: Options) => {
    if (key == null) {
      console.error(`Please provide a publish key, you can generate one at ${domain}settings/columns`)
      exit(1)
    }
    const bundledCodePath = path.join(os.tmpdir(), `${key}.js`)
    if (existsSync(bundledCodePath)) {
      unlinkSync(bundledCodePath)
    }
    const cwd = (file?: string) =>
      path.resolve(path.join(...([options.path == null ? '.' : options.path, file].filter(Boolean) as Array<string>)))
    const sourceCodePath = cwd(options.file + '.ts')
    const buildOptions = {
      entryPoints: [sourceCodePath],
      allowOverwrite: true,
      bundle: true,
      minify: true,
      platform: 'browser',
      absWorkingDir: cwd(),
      outfile: bundledCodePath,
    } as BuildOptions
    // we need to build twice, once with cjs as platform so we can require and validate, second time using esm to publish
    // now we build to verify
    await esbuild.build({ ...buildOptions, format: 'cjs' })
    let type: string | null = null
    let name: string | null = null
    let info: string | null = null

    const [bundledCode, sourceCode] = await Promise.all([
      readFile(bundledCodePath, 'utf8'),
      readFile(sourceCodePath, 'utf8'),
    ])
    const rawColumnExported = require(bundledCodePath)
    if (rawColumnExported?.default == null) {
      console.log(colors.red('Error: unable to find the column schema'))
      exit(0)
    }
    const column: ColumnSchema = rawColumnExported.default
    console.log(colors.cyan('Verifying...'))
    try {
      const validSchema = ColumnSchemaCheck(column)
      type = validSchema!.type
      name = validSchema!.name
      info = validSchema!.info

      if (options.show != null) {
        console.log('bundled code:\n')
        console.log('=============================')
        console.log(bundledCode)
        console.log('=============================')
        console.log(sourceCode)
      }
    } catch (e: any) {
      if (e instanceof Error) {
        console.log(colors.red((e as ColumnSchemaError).readable.toString()))
      } else {
        console.log(colors.red('Error: unknown error'))
      }
      exit(0)
    }
    console.log(colors.cyan('Publishing...'))

    try {
      const result = await axios.post(domain + 'api/column/publish', {
        type,
        name,
        info,
        key,
        bundled: bundledCode,
        source: sourceCode,
      })
      if (result.data.error != null) {
        console.error(colors.red('Error: ' + result.data.error))
      } else {
        console.log(colors.green('Success'))
      }
      exit(0)
    } catch (e) {
      console.error(colors.red('Unknown error, please reach out to us if this problem persists @ hello@column.app'))
    }
  })

program.parse()
