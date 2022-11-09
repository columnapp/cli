#! /usr/bin/env node
import { Command } from 'commander'
import colors from 'colors'
import { exit } from 'process'
import esbuild, { BuildOptions } from 'esbuild'
import os from 'os'
import path from 'path'
import { readFileSync } from 'fs'
import { ColumnSchemaCheck, ColumnSchemaError } from '@columnapp/schema'
type Options = {
  path?: string
}

const program = new Command()
program
  .version('0.1.0')
  .argument('[key]', 'publish key, generate one at https://column.app/publish')
  .option('-p, --path <path>', 'path to the column directory, where package.json is at the root')
  .action(async (key: string | null, options: Options) => {
    if (key == null) {
      console.error('Please provide a publish key, you can generate one at https://column.app/publish')
      exit(1)
    }
    const outfile = path.join(os.tmpdir(), `${key}.js`)
    const cwd = (file?: string) =>
      path.resolve(path.join(...([options.path == null ? '.' : options.path, file].filter(Boolean) as Array<string>)))
    const buildOptions = {
      entryPoints: [cwd('column.ts')],
      allowOverwrite: true,
      bundle: true,
      minify: true,

      platform: 'browser',
      absWorkingDir: cwd(),
      outfile,
    } as BuildOptions
    // we need to build twice, once with cjs as platform so we can require and validate, second time using esm to publish
    // now we build to verify
    await esbuild.build({ ...buildOptions, format: 'cjs' })

    const column = require(outfile)
    if (column?.default == null) {
      console.log(colors.red('Error: unable to find the column schema'))
      exit(0)
    }
    console.log(colors.cyan('Verifying...'))
    try {
      delete column.default['version']
      const validSchema = ColumnSchemaCheck(column.default)
    } catch (e: any) {
      if (e instanceof Error) {
        console.log(colors.red((e as ColumnSchemaError).readable.toString()))
      } else {
        console.log(colors.red('Error: unknown error'))
      }
      exit(0)
    }
    console.log(colors.cyan('Publishing...'))
    // TODO: publish here
  })

program.parse()
