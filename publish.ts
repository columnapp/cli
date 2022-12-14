#! /usr/bin/env node
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
import { fromZodError } from 'zod-validation-error'
type Options = {
  path?: string
  file: string
  show?: boolean
  dryrun?: boolean
}
const domain = process.env.DOMAIN ?? 'https://column.app/'
export function publish(program: Command) {
  program
    .command('publish')
    .argument('[key]', `publish key, generate one at ${domain}publish`)
    // TODO: unable to publish in the same directory, always needs to have -p for some reason
    .option('-p, --path <path>', 'path to the column directory, where package.json is at the root')
    .option('-s, --show', 'show the code')
    .option('-d, --dryrun', 'do not publish')
    .option(
      'f, --file <filename>',
      'file name without extension that exports the column schema, defaults to "index"',
      'index',
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
      // console.log(cwd('test'))
      // exit(1)
      const sourceCodePath = cwd(options.file + '.ts')
      const buildOptions = {
        entryPoints: [sourceCodePath],
        allowOverwrite: true,
        bundle: true,
        minify: true,
        platform: 'browser',
        format: 'esm',
        absWorkingDir: cwd(),
        outfile: bundledCodePath,
      } as BuildOptions
      // we need to build twice, once with cjs as platform so we can require and validate, second time using esm to publish
      // now we build to verify
      await esbuild.build({ ...buildOptions, format: 'cjs' })
      let name: string | null = null
      let info: string | null = null

      let [bundledCode, sourceCode] = await Promise.all([
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
      let validSchema = null
      try {
        validSchema = ColumnSchemaCheck(column)
      } catch (e: any) {
        const errors = fromZodError(e)
        console.error('Error: invalid schema')
        console.log(errors)
        exit(1)
      }
      try {
        // by now it's validated, so now we rebuild to be published using esm
        // overwriting bundledCodePath
        await esbuild.build({ ...buildOptions })
        bundledCode = await readFile(bundledCodePath, 'utf8')

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

      if (options.dryrun) {
        console.log('Skipping publish...')
        exit(0)
      }
      console.log(colors.cyan('Publishing...'))
      try {
        const result = await axios.post(domain + 'api/column/publish', {
          name,
          info,
          key,
          bundled: bundledCode,
          source: sourceCode,
        })
        if (result.data.error != null) {
          console.error(colors.red('Error: ' + result.data.error))
          exit(1)
        } else {
          console.log(colors.green('Success'))
          exit(0)
        }
      } catch (e) {
        console.error(colors.red('Unknown error, please reach out to us if this problem persists @ hello@column.app'))
      }
    })
}
